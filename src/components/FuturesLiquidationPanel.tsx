"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    AlertTriangle,
    Download,
    ExternalLink,
    RefreshCw,
} from "lucide-react";
import { useMarket } from "../context/MarketContext";
import { cn } from "../lib/utils";
import { normalizeBinanceFuturesForceOrderEvent } from "../services/dataStream/normalizeBinanceEvent";
import { useI18n } from "../context/I18nContext";
import { binanceService } from "../services/binanceService";

type LiquidationRecord = {
    id: string;
    eventTimeMs: number;
    price: number;
    qty: number;
    usdValue: number;
    timeLabel: string;
    symbol: string;
    name: string;
    side: "buy" | "sell";
    tif: string;
    type: string;
    status: string;
    priceText: string;
    avgPriceText: string;
    qtyText: string;
    filledText: string;
    usdText: string;
};

const MIN_NOTIONAL_PRESETS = [0, 10_000, 50_000, 100_000, 500_000] as const;

function displayShortSymbol(sym: string) {
    return sym.replace(/USDT$|USDC$|BUSD$/, "") || sym;
}

type SideBucket = "all" | "long" | "short";

function triggerDownload(filename: string, body: string, mime: string) {
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.click();
    URL.revokeObjectURL(url);
}

function exportLiquidationJson(rows: LiquidationRecord[]) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const payload = {
        exportedAt: new Date().toISOString(),
        source: "Binance USD-M Futures WebSocket !forceOrder@arr (FinTrace in-memory buffer)",
        note: "Rows are only what this panel collected since load or last reconnect; not full exchange history.",
        rowCount: rows.length,
        rows: rows.map((r) => ({
            eventTimeMs: r.eventTimeMs,
            symbol: r.symbol,
            side: r.side,
            liquidationSideHint:
                r.side === "sell" ? "long_closed" : "short_closed",
            price: r.price,
            qty: r.qty,
            usdValue: r.usdValue,
            orderType: r.type,
            status: r.status,
            tif: r.tif,
        })),
    };
    triggerDownload(
        `liquidation-buffer-${stamp}.json`,
        JSON.stringify(payload, null, 2),
        "application/json;charset=utf-8",
    );
}

function exportLiquidationCsv(rows: LiquidationRecord[]) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const header = [
        "eventTimeIso",
        "symbol",
        "side",
        "price",
        "qty",
        "usdValue",
        "orderType",
        "status",
        "tif",
    ];
    const lines = rows.map((r) =>
        [
            new Date(r.eventTimeMs).toISOString(),
            r.symbol,
            r.side,
            r.price,
            r.qty,
            r.usdValue,
            csvEscape(r.type),
            csvEscape(r.status),
            csvEscape(r.tif),
        ].join(","),
    );
    triggerDownload(
        `liquidation-buffer-${stamp}.csv`,
        [header.join(","), ...lines].join("\n"),
        "text/csv;charset=utf-8",
    );
}

function csvEscape(s: string) {
    if (!/[",\n]/.test(s)) return s;
    return `"${s.replace(/"/g, '""')}"`;
}

const MAX_ROWS = 250;
const LIQUIDATION_GRID =
    "grid-cols-[80px_120px_72px_92px_92px_88px_96px_108px_140px]";
type SharedStatus = "connecting" | "connected" | "error";
type ForceOrderListener = (event: any) => void;
type StatusListener = (status: SharedStatus, error: string | null) => void;

const FORCE_ORDER_WS_URL = "wss://fstream.binance.com/ws/!forceOrder@arr";
const BINANCE_DATA_VISION = "https://data.binance.vision/";

let sharedForceOrderSocket: WebSocket | null = null;
let sharedReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let sharedSubscribers = 0;
const forceOrderListeners = new Set<ForceOrderListener>();
const forceOrderStatusListeners = new Set<StatusListener>();
let sharedStatus: SharedStatus = "connecting";
let sharedError: string | null = null;

function broadcastStatus(status: SharedStatus, error: string | null) {
    sharedStatus = status;
    sharedError = error;
    for (const listener of forceOrderStatusListeners) {
        listener(status, error);
    }
}

function scheduleSharedReconnect() {
    if (sharedSubscribers === 0) return;
    if (sharedReconnectTimer) clearTimeout(sharedReconnectTimer);
    sharedReconnectTimer = setTimeout(() => {
        connectSharedForceOrderSocket();
    }, 1500);
}

function closeSharedForceOrderSocket() {
    if (sharedReconnectTimer) {
        clearTimeout(sharedReconnectTimer);
        sharedReconnectTimer = null;
    }
    if (sharedForceOrderSocket) {
        sharedForceOrderSocket.onopen = null;
        sharedForceOrderSocket.onerror = null;
        sharedForceOrderSocket.onclose = null;
        sharedForceOrderSocket.onmessage = null;
        sharedForceOrderSocket.close();
        sharedForceOrderSocket = null;
    }
}

function connectSharedForceOrderSocket() {
    if (typeof window === "undefined") return;
    if (sharedSubscribers === 0) return;
    if (sharedForceOrderSocket) return;

    broadcastStatus("connecting", null);

    const ws = new WebSocket(FORCE_ORDER_WS_URL);
    sharedForceOrderSocket = ws;

    ws.onopen = () => {
        if (sharedForceOrderSocket !== ws) return;
        broadcastStatus("connected", null);
    };

    ws.onerror = () => {
        if (sharedForceOrderSocket !== ws) return;
        broadcastStatus("error", "Không thể kết nối liquidation stream.");
    };

    ws.onclose = () => {
        if (sharedForceOrderSocket !== ws) return;
        sharedForceOrderSocket = null;
        scheduleSharedReconnect();
    };

    ws.onmessage = (ev) => {
        try {
            const raw =
                typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
            const payload = raw?.data ?? raw;
            const events = Array.isArray(payload) ? payload : [payload];

            for (const event of events) {
                if (!event || event.e !== "forceOrder" || !event.o) continue;
                for (const listener of forceOrderListeners) {
                    listener(event);
                }
            }
        } catch {
            // Ignore malformed data.
        }
    };
}

function subscribeToForceOrders(
    onEvent: ForceOrderListener,
    onStatus: StatusListener,
) {
    forceOrderListeners.add(onEvent);
    forceOrderStatusListeners.add(onStatus);
    sharedSubscribers += 1;
    onStatus(sharedStatus, sharedError);
    connectSharedForceOrderSocket();

    return () => {
        forceOrderListeners.delete(onEvent);
        forceOrderStatusListeners.delete(onStatus);
        sharedSubscribers = Math.max(0, sharedSubscribers - 1);
        if (sharedSubscribers === 0) {
            closeSharedForceOrderSocket();
        }
    };
}

const usdFmt = (n: number) => {
    if (!Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
    return `$${n.toFixed(2)}`;
};

const numFmt = (n: number) => {
    if (!Number.isFinite(n)) return "—";
    if (n >= 1000)
        return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
    return n.toLocaleString("en-US", { maximumFractionDigits: 8 });
};

function toRecord(
    msg: any,
    pair: string,
    assetName: string | undefined,
): LiquidationRecord | null {
    const e = normalizeBinanceFuturesForceOrderEvent(msg, pair);
    if (!e) return null;
    return {
        id: `${e.pair}-${e.eventTimeMs}-${e.side}-${e.price}-${e.qty}`,
        eventTimeMs: e.eventTimeMs,
        price: e.price,
        qty: e.qty,
        usdValue: e.usdValue,
        timeLabel: new Date(e.eventTimeMs).toLocaleTimeString("en-GB", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }),
        symbol: e.pair,
        name: assetName ?? e.token,
        side: e.side,
        tif: typeof msg?.o?.f === "string" ? msg.o.f : "--",
        type: e.orderType,
        status: e.status ?? "--",
        priceText: numFmt(e.price),
        avgPriceText: numFmt(e.avgPrice ?? e.price),
        qtyText: numFmt(e.qty),
        filledText: numFmt(e.accumulatedFilledQty ?? e.lastFilledQty ?? e.qty),
        usdText: usdFmt(e.usdValue),
    };
}

type FuturesLiquidationPanelProps = {
    /** Dedicated `/liquidation` route: connect futures feed even when app market is Spot. */
    standalone?: boolean;
};

export const FuturesLiquidationPanel = ({
    standalone = false,
}: FuturesLiquidationPanelProps) => {
    const { t, locale } = useI18n();
    const { marketType, selectedSymbol, setSelectedSymbol, futuresAssets } =
        useMarket();
    const effectiveFutures = standalone || marketType === "futures";
    const [rows, setRows] = useState<LiquidationRecord[]>([]);
    const [status, setStatus] = useState<SharedStatus>("connecting");
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [receivedCount, setReceivedCount] = useState(0);
    const [viewMode, setViewMode] = useState<"symbol" | "all">("all");
    const [symbolSearch, setSymbolSearch] = useState("");
    const [sideBucket, setSideBucket] = useState<SideBucket>("all");
    const [minNotionalUsd, setMinNotionalUsd] = useState(0);
    const [premium, setPremium] = useState<{
        markPrice: string;
        indexPrice: string;
        lastFundingRate: string;
        nextFundingTime: number;
    } | null>(null);
    const [premiumError, setPremiumError] = useState(false);
    const selectedSymbolRef = useRef(selectedSymbol);
    const seenIdsRef = useRef<Set<string>>(new Set());
    const assetNameMapRef = useRef<Record<string, string>>({});

    useEffect(() => {
        selectedSymbolRef.current = selectedSymbol;
    }, [selectedSymbol]);

    useEffect(() => {
        assetNameMapRef.current = Object.fromEntries(
            futuresAssets.map((asset) => [asset.id.toUpperCase(), asset.name]),
        );
    }, [futuresAssets]);

    useEffect(() => {
        if (!effectiveFutures) return;
        const unsubscribe = subscribeToForceOrders(
            (event) => {
                setReceivedCount((prev) => prev + 1);

                const eventSymbol =
                    typeof event?.o?.s === "string"
                        ? String(event.o.s).toUpperCase()
                        : "";
                const recordSymbol =
                    eventSymbol || selectedSymbolRef.current.toUpperCase();

                const rec = toRecord(
                    event,
                    recordSymbol,
                    assetNameMapRef.current[recordSymbol],
                );
                if (!rec) return;
                if (seenIdsRef.current.has(rec.id)) return;
                seenIdsRef.current.add(rec.id);

                setRows((prev) => [rec, ...prev].slice(0, MAX_ROWS));
            },
            (nextStatus, nextError) => {
                setStatus(nextStatus);
                setError(nextError);
            },
        );

        return unsubscribe;
    }, [effectiveFutures, reloadKey]);

    useEffect(() => {
        if (!effectiveFutures) return;
        let cancelled = false;
        const load = () => {
            binanceService
                .getFuturesPremiumIndex(selectedSymbol)
                .then((p) => {
                    if (cancelled) return;
                    setPremium({
                        markPrice: p.markPrice,
                        indexPrice: p.indexPrice,
                        lastFundingRate: p.lastFundingRate,
                        nextFundingTime: p.nextFundingTime,
                    });
                    setPremiumError(false);
                })
                .catch(() => {
                    if (cancelled) return;
                    setPremium(null);
                    setPremiumError(true);
                });
        };
        load();
        const id = window.setInterval(load, 25_000);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [effectiveFutures, selectedSymbol]);

    const bufferStats = useMemo(() => {
        let longUsd = 0;
        let shortUsd = 0;
        let totalUsd = 0;
        const bySym: Record<string, number> = {};
        for (const r of rows) {
            totalUsd += r.usdValue;
            if (r.side === "sell") longUsd += r.usdValue;
            else shortUsd += r.usdValue;
            bySym[r.symbol] = (bySym[r.symbol] ?? 0) + r.usdValue;
        }
        const topSymbols = Object.entries(bySym)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
        return { longUsd, shortUsd, totalUsd, topSymbols };
    }, [rows]);

    const baseRows = useMemo(() => {
        return viewMode === "all"
            ? rows
            : rows.filter((row) => row.symbol === selectedSymbol);
    }, [rows, viewMode, selectedSymbol]);

    const visibleRows = useMemo(() => {
        let v = baseRows;
        const q = symbolSearch.trim().toUpperCase();
        if (q) v = v.filter((r) => r.symbol.includes(q));
        if (sideBucket === "long") v = v.filter((r) => r.side === "sell");
        else if (sideBucket === "short") v = v.filter((r) => r.side === "buy");
        if (minNotionalUsd > 0)
            v = v.filter((r) => r.usdValue >= minNotionalUsd);
        return v;
    }, [baseRows, symbolSearch, sideBucket, minNotionalUsd]);

    const fundingPct =
        premium && Number.isFinite(Number(premium.lastFundingRate))
            ? (Number(premium.lastFundingRate) * 100).toFixed(4)
            : null;

    if (!effectiveFutures) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-[12px] text-muted">
                {t("liquidationPanel.futuresOnly")}
            </div>
        );
    }

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-main lg:flex-row">
            <div
                className={cn(
                    "flex min-h-0 shrink-0 flex-col",
                    "max-h-[min(52vh,480px)] overflow-y-auto overflow-x-hidden border-b border-main bg-secondary/10 thin-scrollbar lg:max-h-none lg:w-[min(100%,380px)] lg:border-b-0 lg:border-r lg:overflow-y-auto",
                )}
            >
                {standalone ? (
                    <div className="shrink-0 border-b border-main px-4 py-3">
                        <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.22em] text-red-500">
                            {t("liquidationPage.title")}
                        </div>

                        <a
                            href={BINANCE_DATA_VISION}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] text-accent hover:underline"
                        >
                            {t("liquidationPage.dataArchive")}
                            <ExternalLink size={12} />
                        </a>
                    </div>
                ) : null}

                {error ? (
                    <div className="mx-4 mt-3 shrink-0 px-3 py-2 rounded-md border border-rose-500/20 bg-rose-500/10 text-rose-500 text-[11px] flex items-center gap-2">
                        <AlertCircle size={13} />
                        {error}
                    </div>
                ) : null}

                <div className="mx-4 mt-2 shrink-0 px-3 py-2 rounded border border-main bg-secondary/10 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono tabular-nums text-main">
                    {premiumError ? (
                        <span className="text-rose-500">
                            {t("liquidationPanel.contextError")} ·{" "}
                            {selectedSymbol}
                        </span>
                    ) : premium ? (
                        <>
                            <span>
                                <span className="text-muted">
                                    {t("liquidationPanel.contextMark")}{" "}
                                </span>
                                {Number(premium.markPrice).toLocaleString(
                                    locale,
                                    {
                                        maximumFractionDigits: 2,
                                    },
                                )}
                            </span>
                            <span>
                                <span className="text-muted">
                                    {t("liquidationPanel.contextIndex")}{" "}
                                </span>
                                {Number(premium.indexPrice).toLocaleString(
                                    locale,
                                    {
                                        maximumFractionDigits: 2,
                                    },
                                )}
                            </span>
                            <span>
                                <span className="text-muted">
                                    {t("liquidationPanel.contextFunding")}{" "}
                                </span>
                                {fundingPct !== null ? `${fundingPct}%` : "—"}
                            </span>
                            <span className="text-muted">
                                {t("liquidationPanel.contextNext")}{" "}
                                {new Date(
                                    premium.nextFundingTime,
                                ).toLocaleString(locale, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    month: "short",
                                    day: "numeric",
                                })}
                            </span>
                        </>
                    ) : (
                        <span className="text-muted animate-pulse">…</span>
                    )}
                </div>

                <div className="grid shrink-0 grid-cols-3 gap-2 px-4 pt-3 text-[10px]">
                    <div className="rounded border border-main bg-main/50 px-2 py-1.5">
                        <div className="text-muted uppercase tracking-wide">
                            {t("liquidationPanel.statTotal")}
                        </div>
                        <div className="font-mono font-semibold tabular-nums">
                            {usdFmt(bufferStats.totalUsd)}
                        </div>
                    </div>
                    <div className="rounded border border-main bg-main/50 px-2 py-1.5">
                        <div className="text-muted uppercase tracking-wide">
                            {t("liquidationPanel.statLong")}
                        </div>
                        <div className="font-mono font-semibold tabular-nums text-rose-500">
                            {usdFmt(bufferStats.longUsd)}
                        </div>
                    </div>
                    <div className="rounded border border-main bg-main/50 px-2 py-1.5">
                        <div className="text-muted uppercase tracking-wide">
                            {t("liquidationPanel.statShort")}
                        </div>
                        <div className="font-mono font-semibold tabular-nums text-emerald-500">
                            {usdFmt(bufferStats.shortUsd)}
                        </div>
                    </div>
                </div>

                <div className="mx-4 mt-3 shrink-0 space-y-3 rounded-lg border border-main bg-main/40 px-3 py-3">
                    <div className="flex items-center justify-between gap-2 border-b border-main pb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            {t("liquidationPanel.filtersHeading")}
                        </span>
                        <span
                            className="text-[9px] font-mono tabular-nums text-muted"
                            title={t("liquidationPanel.filterMatchTitle")}
                        >
                            {t("liquidationPanel.filterMatchShort", {
                                shown: visibleRows.length,
                                received: receivedCount,
                            })}
                        </span>
                    </div>

                    <div className="space-y-1.5">
                        <div className="text-[9px] font-medium uppercase tracking-wide text-muted">
                            {t("liquidationPanel.filterScope")}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded-md border border-main bg-main p-0.5">
                                <button
                                    type="button"
                                    title={t("liquidationPanel.followSymbol", {
                                        symbol: selectedSymbol,
                                    })}
                                    onClick={() => setViewMode("symbol")}
                                    className={cn(
                                        "rounded px-2 py-1 text-[10px] font-mono font-medium transition-colors",
                                        viewMode === "symbol"
                                            ? "bg-accent/15 text-accent"
                                            : "text-muted hover:text-main",
                                    )}
                                >
                                    {selectedSymbol}
                                </button>
                                <button
                                    type="button"
                                    title={t("liquidationPanel.followAll")}
                                    onClick={() => setViewMode("all")}
                                    className={cn(
                                        "rounded px-2 py-1 text-[10px] font-medium transition-colors",
                                        viewMode === "all"
                                            ? "bg-accent/15 text-accent"
                                            : "text-muted hover:text-main",
                                    )}
                                >
                                    {t("common.all")}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div
                            className="text-[9px] font-medium uppercase tracking-wide text-muted"
                            title={`${t("liquidationPanel.sideLongHint")} · ${t("liquidationPanel.sideShortHint")}`}
                        >
                            {t("liquidationPanel.filterSide")}
                        </div>
                        <div className="inline-flex flex-wrap rounded-md border border-main bg-main p-0.5">
                            <button
                                type="button"
                                title={t("liquidationPanel.sideLongHint")}
                                onClick={() => setSideBucket("all")}
                                className={cn(
                                    "rounded px-2 py-1 text-[10px] font-medium transition-colors",
                                    sideBucket === "all"
                                        ? "bg-accent/15 text-accent"
                                        : "text-muted hover:text-main",
                                )}
                            >
                                {t("liquidationPanel.sideAll")}
                            </button>
                            <button
                                type="button"
                                title={t("liquidationPanel.sideLongHint")}
                                onClick={() => setSideBucket("long")}
                                className={cn(
                                    "rounded px-2 py-1 text-[10px] font-medium transition-colors",
                                    sideBucket === "long"
                                        ? "bg-rose-500/15 text-rose-400"
                                        : "text-muted hover:text-main",
                                )}
                            >
                                {t("liquidationPanel.sideLongLiq")}
                            </button>
                            <button
                                type="button"
                                title={t("liquidationPanel.sideShortHint")}
                                onClick={() => setSideBucket("short")}
                                className={cn(
                                    "rounded px-2 py-1 text-[10px] font-medium transition-colors",
                                    sideBucket === "short"
                                        ? "bg-emerald-500/15 text-emerald-400"
                                        : "text-muted hover:text-main",
                                )}
                            >
                                {t("liquidationPanel.sideShortLiq")}
                            </button>
                        </div>
                    </div>

                    <input
                        type="search"
                        value={symbolSearch}
                        onChange={(e) => setSymbolSearch(e.target.value)}
                        placeholder={t("liquidationPanel.filterSymbol")}
                        aria-label={t("liquidationPanel.filterSymbol")}
                        className="w-full rounded-md border border-main bg-main px-2 py-1.5 text-[10px] font-mono text-main placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />

                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="liq-min-notional"
                            className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-muted"
                        >
                            {t("liquidationPanel.minNotional")}
                        </label>
                        <select
                            id="liq-min-notional"
                            value={String(minNotionalUsd)}
                            onChange={(e) =>
                                setMinNotionalUsd(Number(e.target.value))
                            }
                            className="min-w-0 flex-1 rounded-md border border-main bg-main px-2 py-1.5 text-[10px] font-mono text-main focus:outline-none focus:ring-1 focus:ring-accent/30"
                        >
                            {MIN_NOTIONAL_PRESETS.map((n) => (
                                <option key={n} value={String(n)}>
                                    {n === 0
                                        ? t("liquidationPanel.minAny")
                                        : usdFmt(n)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mx-4 mt-3 mb-4 shrink-0 border-t border-main pt-3">
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-muted">
                        {t("liquidationPanel.topInBuffer")}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                        {bufferStats.topSymbols.length === 0 ? (
                            <span className="text-[10px] text-muted">—</span>
                        ) : (
                            bufferStats.topSymbols.map(([sym, usd]) => (
                                <button
                                    key={sym}
                                    type="button"
                                    title={`${sym} · ${usdFmt(usd)}`}
                                    onClick={() => {
                                        setSelectedSymbol(sym);
                                        setViewMode("symbol");
                                        setSymbolSearch("");
                                    }}
                                    className="rounded border border-main bg-main px-2 py-1 text-[10px] font-mono text-main transition-colors hover:border-accent/40 hover:text-accent"
                                >
                                    {displayShortSymbol(sym)}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-main">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-y-2 border-b border-main bg-secondary/10 px-4 py-4">
                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                status === "connected"
                                    ? "bg-emerald-500 animate-pulse"
                                    : status === "error"
                                      ? "bg-rose-500"
                                      : "bg-amber-400 animate-pulse",
                            )}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                            {status === "connected"
                                ? t("liquidationPanel.live")
                                : status === "error"
                                  ? t("liquidationPanel.streamError")
                                  : t("liquidationPanel.connecting")}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="text-[10px] text-muted font-mono tabular-nums">
                            {t("liquidationPanel.bufferRows", {
                                rows: rows.length,
                                max: MAX_ROWS,
                            })}
                        </span>
                        <button
                            type="button"
                            title={t("liquidationPanel.exportHint")}
                            onClick={() => exportLiquidationJson(rows)}
                            disabled={rows.length === 0}
                            className="flex items-center gap-1 rounded border border-main bg-main px-2 py-1 text-[10px] font-medium text-muted transition-colors hover:bg-secondary hover:text-main disabled:opacity-40"
                        >
                            <Download size={10} />
                            {t("liquidationPanel.exportJson")}
                        </button>
                        <button
                            type="button"
                            title={t("liquidationPanel.exportHint")}
                            onClick={() => exportLiquidationCsv(rows)}
                            disabled={rows.length === 0}
                            className="flex items-center gap-1 rounded border border-main bg-main px-2 py-1 text-[10px] font-medium text-muted transition-colors hover:bg-secondary hover:text-main disabled:opacity-40"
                        >
                            <Download size={10} />
                            {t("liquidationPanel.exportCsv")}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                closeSharedForceOrderSocket();
                                setRows([]);
                                setReceivedCount(0);
                                seenIdsRef.current = new Set();
                                setReloadKey((prev) => prev + 1);
                            }}
                            className="flex items-center gap-1 rounded border border-main bg-main px-2 py-1 text-[10px] font-medium text-muted transition-colors hover:bg-secondary hover:text-main"
                        >
                            <RefreshCw size={10} />
                            {t("liquidationPanel.reconnect")}
                        </button>
                    </div>
                </div>

                <div className="min-h-0 min-w-0 flex-1 overflow-auto thin-scrollbar">
                    <div className="min-w-max">
                        <div
                            className={cn(
                                "sticky top-0 z-10 grid shrink-0 gap-x-3 border-b border-main bg-main px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-muted",
                                LIQUIDATION_GRID,
                            )}
                        >
                            <span>{t("liquidationPanel.time")}</span>
                            <span>{t("liquidationPanel.asset")}</span>
                            <span>{t("liquidationPanel.side")}</span>
                            <span className="text-right">
                                {t("liquidationPanel.price")}
                            </span>
                            <span className="text-right">
                                {t("liquidationPanel.avgPrice")}
                            </span>
                            <span className="text-right">
                                {t("liquidationPanel.qty")}
                            </span>
                            <span className="text-right">
                                {t("liquidationPanel.filled")}
                            </span>
                            <span className="text-right">
                                {t("liquidationPanel.notional")}
                            </span>
                            <span>{t("liquidationPanel.order")}</span>
                        </div>
                        {visibleRows.length === 0 ? (
                            <div className="flex min-h-[12rem] items-center justify-center px-4 py-8 text-center text-[12px] text-muted">
                                {receivedCount > 0
                                    ? viewMode === "symbol"
                                        ? t(
                                              "liquidationPanel.noRowsForSymbol",
                                              {
                                                  symbol: selectedSymbol,
                                              },
                                          )
                                        : t("liquidationPanel.noValidRows")
                                    : t("liquidationPanel.noEvents")}
                            </div>
                        ) : (
                            visibleRows.map((r) => (
                                <div
                                    key={r.id}
                                    className={cn(
                                        "grid gap-x-3 px-4 py-2 border-b border-main text-[10px] font-mono hover:bg-secondary/40",
                                        LIQUIDATION_GRID,
                                    )}
                                >
                                    <span className="text-muted tabular-nums">
                                        {r.timeLabel}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-main font-semibold">
                                            {r.symbol}
                                        </span>
                                    </span>
                                    <span
                                        className={cn(
                                            "font-semibold tabular-nums",
                                            r.side === "buy"
                                                ? "text-emerald-500"
                                                : "text-rose-500",
                                        )}
                                    >
                                        {r.side.toUpperCase()}
                                    </span>
                                    <span className="text-right text-main tabular-nums">
                                        {r.priceText}
                                    </span>
                                    <span className="text-right text-main tabular-nums">
                                        {r.avgPriceText}
                                    </span>
                                    <span className="text-right text-main tabular-nums">
                                        {r.qtyText}
                                    </span>
                                    <span className="text-right text-main tabular-nums">
                                        {r.filledText}
                                    </span>
                                    <span className="text-right font-semibold tabular-nums text-main">
                                        {r.usdText}
                                    </span>
                                    <span
                                        className="text-muted truncate"
                                        title={`${r.type} · ${r.tif} · ${r.status}`}
                                    >
                                        {r.type} · {r.tif} · {r.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
