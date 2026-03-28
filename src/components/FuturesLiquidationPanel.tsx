"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useMarket } from "../context/MarketContext";
import { useUniverse } from "../context/UniverseContext";
import { cn } from "../lib/utils";
import {
    normalizeBinanceFuturesForceOrderEvent,
} from "../services/dataStream/normalizeBinanceEvent";

type LiquidationRecord = {
    id: string;
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

const MAX_ROWS = 120;
const LIQUIDATION_GRID =
    "grid-cols-[80px_120px_72px_92px_92px_88px_96px_108px_140px]";
type SharedStatus = "connecting" | "connected" | "error";
type ForceOrderListener = (event: any) => void;
type StatusListener = (status: SharedStatus, error: string | null) => void;

const FORCE_ORDER_WS_URL = "wss://fstream.binance.com/ws/!forceOrder@arr";

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
    if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
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

export const FuturesLiquidationPanel = () => {
    const { marketType, selectedSymbol, futuresAssets } = useMarket();
    const { isMockUniverse } = useUniverse();
    const [rows, setRows] = useState<LiquidationRecord[]>([]);
    const [status, setStatus] = useState<SharedStatus>("connecting");
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [receivedCount, setReceivedCount] = useState(0);
    const [viewMode, setViewMode] = useState<"symbol" | "all">("symbol");
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
        if (marketType !== "futures") return;
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
    }, [marketType, reloadKey]);

    const visibleRows =
        viewMode === "all"
            ? rows
            : rows.filter((row) => row.symbol === selectedSymbol);

    if (isMockUniverse) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-[12px] text-muted">
                Liquidation stream đang ở chế độ mock stock và chưa kết nối dữ liệu thật.
            </div>
        );
    }

    if (marketType !== "futures") {
        return (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-[12px] text-muted">
                Liquidation stream chỉ hỗ trợ Binance Futures.
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-main">
            <div className="px-4 py-2 border-b border-main bg-secondary/10 flex items-center justify-between shrink-0">
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
                            ? "Live Liquidations"
                            : status === "error"
                              ? "Stream Error"
                              : "Connecting"}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        closeSharedForceOrderSocket();
                        setRows([]);
                        setReceivedCount(0);
                        seenIdsRef.current = new Set();
                        setReloadKey((prev) => prev + 1);
                    }}
                    className="px-2 py-1 rounded border border-main bg-main text-muted hover:text-main hover:bg-secondary transition-colors text-[10px] font-medium flex items-center gap-1"
                >
                    <RefreshCw size={10} />
                    Reconnect
                </button>
            </div>

            {error ? (
                <div className="mx-4 mt-3 px-3 py-2 rounded-md border border-rose-500/20 bg-rose-500/10 text-rose-500 text-[11px] flex items-center gap-2">
                    <AlertCircle size={13} />
                    {error}
                </div>
            ) : null}

            <div className="px-4 pt-3 pb-2 text-[11px] text-muted">
                {viewMode === "symbol"
                    ? `Theo dõi feed thanh lý futures và lọc theo ${selectedSymbol}.`
                    : "Theo dõi toàn bộ liquidation futures market."}
            </div>

            <div className="px-4 pb-2 text-[10px] text-muted font-mono">
                received: {receivedCount} · shown: {visibleRows.length}
            </div>

            <div className="px-4 pb-3 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setViewMode("symbol")}
                    className={cn(
                        "px-2.5 py-1 rounded border text-[10px] font-medium transition-colors",
                        viewMode === "symbol"
                            ? "border-accent/40 bg-accent/10 text-accent"
                            : "border-main bg-main text-muted hover:text-main hover:bg-secondary",
                    )}
                >
                    {selectedSymbol}
                </button>
                <button
                    type="button"
                    onClick={() => setViewMode("all")}
                    className={cn(
                        "px-2.5 py-1 rounded border text-[10px] font-medium transition-colors",
                        viewMode === "all"
                            ? "border-accent/40 bg-accent/10 text-accent"
                            : "border-main bg-main text-muted hover:text-main hover:bg-secondary",
                    )}
                >
                    Tất cả
                </button>
            </div>

            <div
                className={cn(
                    "grid gap-x-3 px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-muted border-y border-main bg-secondary/10 shrink-0",
                    LIQUIDATION_GRID,
                )}
            >
                <span>Time</span>
                <span>Asset</span>
                <span>Side</span>
                <span className="text-right">Price</span>
                <span className="text-right">Avg Price</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Filled</span>
                <span className="text-right">Notional</span>
                <span>Order</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
                {visibleRows.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[12px] text-muted px-4 text-center">
                        {receivedCount > 0
                            ? viewMode === "symbol"
                                ? `Feed đang có dữ liệu, nhưng chưa có liquidation nào khớp ${selectedSymbol}.`
                                : "Feed đang có dữ liệu nhưng chưa có row hợp lệ để hiển thị."
                            : `Chưa nhận được liquidation event nào cho feed futures.`}
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
                            <span className="text-muted tabular-nums">{r.timeLabel}</span>
                            <span className="min-w-0">
                                <span className="block truncate text-main font-semibold">{r.symbol}</span>
                                <span className="block truncate text-[9px] text-muted">{r.name}</span>
                            </span>
                            <span
                                className={cn(
                                    "font-semibold tabular-nums",
                                    r.side === "buy" ? "text-emerald-500" : "text-rose-500",
                                )}
                            >
                                {r.side.toUpperCase()}
                            </span>
                            <span className="text-right text-main tabular-nums">{r.priceText}</span>
                            <span className="text-right text-main tabular-nums">{r.avgPriceText}</span>
                            <span className="text-right text-main tabular-nums">{r.qtyText}</span>
                            <span className="text-right text-main tabular-nums">{r.filledText}</span>
                            <span className="text-right font-semibold tabular-nums text-main">{r.usdText}</span>
                            <span className="text-muted truncate" title={`${r.type} · ${r.tif} · ${r.status}`}>
                                {r.type} · {r.tif} · {r.status}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
