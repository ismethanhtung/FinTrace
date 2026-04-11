import type {
    DataStreamConfig,
    DataStreamEvent,
    DataStreamFundingEvent,
    DataStreamMetrics,
    DataStreamTradeEvent,
    StreamRecord,
    DataStreamWorkerStateMessage,
} from "./types";

const MAX_RECORDS_FALLBACK = 250;
const SPEED_WINDOW_MS = 10_000;
const NET_WINDOW_MS = 30_000;
const AGG_WINDOW_MS = 2 * 60_000;

function timeLabelHHMMSS(ms: number): string {
    const d = new Date(ms);
    return d.toLocaleTimeString("en-GB", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function usdCompact(v: number): string {
    const abs = Math.abs(v);
    if (abs >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
    return `$${v.toFixed(2)}`;
}

function clamp01(x: number): number {
    return Math.min(1, Math.max(0, x));
}

function fmtFundingRatePct(r: number): string {
    const pct = r * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(4)}%`;
}

function makeTradeRecord(
    e: DataStreamTradeEvent,
    action: string,
    tone: "up" | "down" | "accent",
    valueText: string,
    details?: string,
): StreamRecord {
    const id = `${e.pair}-${e.tradeId ?? e.eventTimeMs}-${action}`;
    return {
        id,
        timeLabel: timeLabelHHMMSS(e.eventTimeMs),
        action,
        token: e.token,
        valueText,
        source: e.source,
        details,
        tone,
    };
}

function makeFundingRecord(e: DataStreamFundingEvent): StreamRecord {
    const id = `${e.pair}-funding-${e.eventTimeMs}`;
    const rTxt = fmtFundingRatePct(e.fundingRateDecimal);
    const tone = e.fundingRateDecimal >= 0 ? "up" : "down";
    const next = Number.isFinite(e.nextFundingTimeMs)
        ? new Date(e.nextFundingTimeMs).toLocaleTimeString("en-GB", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
          })
        : "--";

    return {
        id,
        timeLabel: timeLabelHHMMSS(e.eventTimeMs),
        action: "FUNDING",
        token: e.token,
        valueText: rTxt,
        source: e.source,
        details: `Next: ${next}`,
        tone,
    };
}

/**
 * Main-thread replacement for `dataStreamWorker.ts`: same tape + metrics logic,
 * no Web Worker (avoids Turbopack/bundling issues and silent worker failures).
 */
export class DataStreamEngine {
    private config: DataStreamConfig = {
        minVolumeUsd: 1_000,
        highlightUsd: 50_000,
        showBuy: true,
        showSell: true,
        showFunding: true,
        showHighlightOnly: false,
        maxRecords: MAX_RECORDS_FALLBACK,
    };

    private records: StreamRecord[] = [];
    private highlightSeq = 0;
    private lastHighlightRecordId: string | undefined;

    private tradeEventsByTime: Array<{
        t: number;
        side: "buy" | "sell";
        usdValue: number;
        isHighlight: boolean;
    }> = [];

    private speedTimestamps: number[] = [];
    private dirty = false;

    init(config: DataStreamConfig): void {
        this.config = { ...config };
        this.records = [];
        this.highlightSeq = 0;
        this.lastHighlightRecordId = undefined;
        this.tradeEventsByTime = [];
        this.speedTimestamps = [];
        this.dirty = true;
    }

    setConfig(config: DataStreamConfig): void {
        const prevHighlightOnly = this.config.showHighlightOnly;
        this.config = { ...config };

        if (!prevHighlightOnly && this.config.showHighlightOnly) {
            this.records = this.records.filter((r) => r.action === "HIGHLIGHT");
        }

        this.dirty = true;
    }

    reset(): void {
        this.records = [];
        this.highlightSeq = 0;
        this.lastHighlightRecordId = undefined;
        this.tradeEventsByTime = [];
        this.speedTimestamps = [];
        this.dirty = true;
    }

    pushEvent(event: DataStreamEvent): void {
        this.handleEvent(event);
    }

    /**
     * If there were changes since last flush, return immutable STATE snapshot.
     */
    flush(): DataStreamWorkerStateMessage | null {
        if (!this.dirty) return null;
        this.dirty = false;

        const nowMs = Date.now();
        const metrics = this.computeMetrics(nowMs);

        return {
            type: "STATE",
            records: this.records.map((r) => ({ ...r })),
            metrics,
            highlightSeq: this.highlightSeq,
            lastHighlightRecordId: this.lastHighlightRecordId,
        };
    }

    private computeMetrics(nowMs: number): DataStreamMetrics {
        const speedFrom = nowMs - SPEED_WINDOW_MS;
        this.speedTimestamps = this.speedTimestamps.filter((t) => t >= speedFrom);
        const eventRate10s =
            this.speedTimestamps.length / (SPEED_WINDOW_MS / 1000);

        const netFrom = nowMs - NET_WINDOW_MS;
        const aggFrom = nowMs - AGG_WINDOW_MS;

        let buyUsd30s = 0;
        let sellUsd30s = 0;
        let buyUsd2m = 0;
        let sellUsd2m = 0;
        let highlightCount2m = 0;

        for (const te of this.tradeEventsByTime) {
            if (te.t >= netFrom) {
                if (te.side === "buy") buyUsd30s += te.usdValue;
                else sellUsd30s += te.usdValue;
            }
            if (te.t >= aggFrom) {
                if (te.side === "buy") buyUsd2m += te.usdValue;
                else sellUsd2m += te.usdValue;
                if (te.isHighlight) highlightCount2m++;
            }
        }

        const total30 = buyUsd30s + sellUsd30s;
        const buyShare = total30 > 0 ? buyUsd30s / total30 : 0.5;
        const sellShare = total30 > 0 ? sellUsd30s / total30 : 0.5;

        const speedFactor = clamp01(eventRate10s / 40);
        const panicScore = clamp01(sellShare * (0.5 + 0.5 * speedFactor));
        const fomoScore = clamp01(buyShare * (0.5 + 0.5 * speedFactor));

        return {
            eventRate10s,
            buyUsd30s,
            sellUsd30s,
            buyUsd2m,
            sellUsd2m,
            highlightCount2m,
            panicScore,
            fomoScore,
        };
    }

    private pushTradeEventToWindows(
        e: DataStreamTradeEvent,
        isHighlight: boolean,
    ) {
        const nowMs = e.eventTimeMs;
        this.tradeEventsByTime.push({
            t: nowMs,
            side: e.side,
            usdValue: e.usdValue,
            isHighlight,
        });
        this.speedTimestamps.push(nowMs);

        const cutoff =
            nowMs - Math.max(SPEED_WINDOW_MS, NET_WINDOW_MS, AGG_WINDOW_MS);
        this.tradeEventsByTime = this.tradeEventsByTime.filter(
            (x) => x.t >= cutoff,
        );
    }

    private shouldShowTrade(e: DataStreamTradeEvent): boolean {
        if (this.config.showHighlightOnly) return false;
        if (e.side === "buy" && !this.config.showBuy) return false;
        if (e.side === "sell" && !this.config.showSell) return false;
        if (e.usdValue < this.config.minVolumeUsd) return false;
        return true;
    }

    private shouldHighlight(e: DataStreamTradeEvent): boolean {
        return (
            e.side === "buy" &&
            e.usdValue >= this.config.highlightUsd &&
            (this.config.showBuy || this.config.showHighlightOnly)
        );
    }

    private pushRecord(rec: StreamRecord) {
        this.records.unshift(rec);
        if (this.records.length > this.config.maxRecords) {
            this.records = this.records.slice(0, this.config.maxRecords);
        }
    }

    private handleEvent(event: DataStreamEvent) {
        const nowMs = event.eventTimeMs;
        if (!Number.isFinite(nowMs)) return;

        if (event.kind === "trade") {
            const isHighlight = this.shouldHighlight(event);
            this.pushTradeEventToWindows(event, isHighlight);

            if (isHighlight) {
                this.highlightSeq++;
                this.lastHighlightRecordId = `${event.pair}-${event.tradeId ?? event.eventTimeMs}-${event.side}-H`;
                this.pushRecord(
                    makeTradeRecord(
                        event,
                        "HIGHLIGHT",
                        "accent",
                        usdCompact(event.usdValue),
                        `Big BUY (>= ${usdCompact(this.config.highlightUsd)})`,
                    ),
                );
            } else if (this.shouldShowTrade(event)) {
                this.pushRecord(
                    makeTradeRecord(
                        event,
                        event.side === "buy" ? "BUY" : "SELL",
                        event.side === "buy" ? "up" : "down",
                        usdCompact(event.usdValue),
                        event.tradeId ? `Tx: ${event.tradeId}` : undefined,
                    ),
                );
            }
            this.dirty = true;
            return;
        }

        if (event.kind === "funding") {
            if (this.config.showHighlightOnly) return;
            if (!this.config.showFunding) return;
            this.pushRecord(makeFundingRecord(event));
            this.dirty = true;
        }
    }
}
