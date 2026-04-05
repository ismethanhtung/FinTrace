/// <reference lib="webworker" />

import type {
    DataStreamConfig,
    DataStreamEvent,
    DataStreamFundingEvent,
    DataStreamMetrics,
    DataStreamTradeEvent,
    DataStreamWorkerClientMessage,
    DataStreamWorkerStateMessage,
    DataStreamWorkerInitMessage,
    DataStreamWorkerConfigMessage,
    DataStreamWorkerEventMessage,
    DataStreamWorkerResetMessage,
    StreamRecord,
} from "../lib/dataStream/types";

type WorkerIncoming =
    | DataStreamWorkerInitMessage
    | DataStreamWorkerConfigMessage
    | DataStreamWorkerEventMessage
    | DataStreamWorkerResetMessage;

const MAX_RECORDS_FALLBACK = 250;
const FLUSH_MS = 150;
const SPEED_WINDOW_MS = 10_000;
const NET_WINDOW_MS = 30_000;
const AGG_WINDOW_MS = 2 * 60_000; // 2m

let config: DataStreamConfig = {
    minVolumeUsd: 1_000,
    highlightUsd: 50_000,
    showBuy: true,
    showSell: true,
    showFunding: true,
    showHighlightOnly: false,
    maxRecords: MAX_RECORDS_FALLBACK,
};

let records: StreamRecord[] = [];
let highlightSeq = 0;
let lastHighlightRecordId: string | undefined;

// windows (timestamped events, aggregated USD)
let tradeEventsByTime: Array<{
    t: number;
    side: "buy" | "sell";
    usdValue: number;
    isHighlight: boolean;
}> = [];

let speedTimestamps: number[] = [];

let dirty = false;

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

function makeFundingRecord(
    e: DataStreamFundingEvent,
): StreamRecord {
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

function computeMetrics(nowMs: number): DataStreamMetrics {
    const speedFrom = nowMs - SPEED_WINDOW_MS;
    speedTimestamps = speedTimestamps.filter((t) => t >= speedFrom);
    const eventRate10s = speedTimestamps.length / (SPEED_WINDOW_MS / 1000);

    const netFrom = nowMs - NET_WINDOW_MS;
    const aggFrom = nowMs - AGG_WINDOW_MS;

    let buyUsd30s = 0;
    let sellUsd30s = 0;
    let buyUsd2m = 0;
    let sellUsd2m = 0;
    let highlightCount2m = 0;

    for (const te of tradeEventsByTime) {
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

    // Speed saturates at ~40 events/sec.
    const speedFactor = clamp01(eventRate10s / 40);

    // Panic: sell-dominant + fast. FOMO: buy-dominant + fast.
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

function pushTradeEventToWindows(e: DataStreamTradeEvent, isHighlight: boolean) {
    const nowMs = e.eventTimeMs;
    tradeEventsByTime.push({
        t: nowMs,
        side: e.side,
        usdValue: e.usdValue,
        isHighlight,
    });
    speedTimestamps.push(nowMs);

    // prune old data
    const cutoff = nowMs - Math.max(SPEED_WINDOW_MS, NET_WINDOW_MS, AGG_WINDOW_MS);
    tradeEventsByTime = tradeEventsByTime.filter((x) => x.t >= cutoff);
}

function shouldShowTrade(e: DataStreamTradeEvent): boolean {
    if (config.showHighlightOnly) return false;
    if (e.side === "buy" && !config.showBuy) return false;
    if (e.side === "sell" && !config.showSell) return false;
    if (e.usdValue < config.minVolumeUsd) return false;
    return true;
}

function shouldHighlight(e: DataStreamTradeEvent): boolean {
    // Highlight is a subset of BUY events.
    // - Normal mode: highlight obeys showBuy
    // - Highlight-only mode: highlight can show even if showBuy is off
    //   (because user explicitly wants highlight view).
    return (
        e.side === "buy" &&
        e.usdValue >= config.highlightUsd &&
        (config.showBuy || config.showHighlightOnly)
    );
}

function pushRecord(rec: StreamRecord) {
    records.unshift(rec); // newest-first
    if (records.length > config.maxRecords) {
        records = records.slice(0, config.maxRecords);
    }
}

function handleEvent(event: DataStreamEvent) {
    const nowMs = event.eventTimeMs;
    if (!Number.isFinite(nowMs)) return;

    if (event.kind === "trade") {
        const isHighlight = shouldHighlight(event);

        // Always keep windows for metrics even if record filtered.
        pushTradeEventToWindows(event, isHighlight);

        // Add highlight record even if minVolume filter is stricter.
        if (isHighlight) {
            highlightSeq++;
            lastHighlightRecordId = `${event.pair}-${event.tradeId ?? event.eventTimeMs}-${event.side}-H`;
            pushRecord(
                makeTradeRecord(
                    event,
                    "HIGHLIGHT",
                    "accent",
                    usdCompact(event.usdValue),
                    `Big BUY (>= ${usdCompact(config.highlightUsd)})`,
                ),
            );
        } else if (shouldShowTrade(event)) {
            pushRecord(
                makeTradeRecord(
                    event,
                    event.side === "buy" ? "BUY" : "SELL",
                    event.side === "buy" ? "up" : "down",
                    usdCompact(event.usdValue),
                    event.tradeId ? `Tx: ${event.tradeId}` : undefined,
                ),
            );
        }
        dirty = true;
        return;
    }

    if (event.kind === "funding") {
        if (config.showHighlightOnly) return;
        if (!config.showFunding) return;
        pushRecord(makeFundingRecord(event));
        dirty = true;
        return;
    }
}

self.onmessage = (e: MessageEvent<WorkerIncoming>) => {
    const msg = e.data;
    if (!msg || typeof msg.type !== "string") return;

    if (msg.type === "INIT") {
        config = msg.config;
        records = [];
        highlightSeq = 0;
        lastHighlightRecordId = undefined;
        tradeEventsByTime = [];
        speedTimestamps = [];
        dirty = true;
        return;
    }

    if (msg.type === "CONFIG") {
        const prevHighlightOnly = config.showHighlightOnly;
        config = msg.config;

        // UX: when enabling "Highlight only", immediately hide non-highlight
        // records already present in the list.
        if (!prevHighlightOnly && config.showHighlightOnly) {
            records = records.filter((r) => r.action === "HIGHLIGHT");
        }

        dirty = true;
        return;
    }

    if (msg.type === "RESET") {
        records = [];
        highlightSeq = 0;
        lastHighlightRecordId = undefined;
        tradeEventsByTime = [];
        speedTimestamps = [];
        dirty = true;
        return;
    }

    if (msg.type === "EVENT") {
        handleEvent(msg.event);
        return;
    }
};

setInterval(() => {
    if (!dirty) return;
    dirty = false;

    const nowMs = Date.now();
    const metrics = computeMetrics(nowMs);

    const state: DataStreamWorkerStateMessage = {
        type: "STATE",
        records,
        metrics,
        highlightSeq,
        lastHighlightRecordId,
    };

    (self as any).postMessage(state);
}, FLUSH_MS);
