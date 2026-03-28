"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Radio, Waves } from "lucide-react";
import { useMarket } from "../context/MarketContext";
import { useUniverse } from "../context/UniverseContext";
import { cn } from "../lib/utils";

type WhaleTrade = {
    id: string;
    timeLabel: string;
    symbol: string;
    side: "buy" | "sell";
    price: number;
    qty: number;
    usdValue: number;
};

type StreamStatus = "connecting" | "connected" | "error" | "disconnected";

const MAX_ROWS = 150;

function n(v: unknown): number | null {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
        const x = Number(v);
        return Number.isFinite(x) ? x : null;
    }
    return null;
}

function usdFmt(v: number): string {
    if (!Number.isFinite(v)) return "--";
    const abs = Math.abs(v);
    if (abs >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
    return `$${v.toFixed(2)}`;
}

function pxFmt(v: number): string {
    if (!Number.isFinite(v)) return "--";
    if (v < 0.001) return v.toFixed(6);
    if (v < 1) return v.toFixed(4);
    if (v < 10_000) return v.toFixed(2);
    return v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function qtyFmt(v: number): string {
    if (!Number.isFinite(v)) return "--";
    if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
    return v.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

export function SmartMoneyWhalePanel() {
    const { selectedSymbol, marketType } = useMarket();
    const { isMockUniverse } = useUniverse();
    const pair = selectedSymbol.toUpperCase();
    const pairLower = selectedSymbol.toLowerCase();
    const [status, setStatus] = useState<StreamStatus>("connecting");
    const [rows, setRows] = useState<WhaleTrade[]>([]);
    const [receivedCount, setReceivedCount] = useState(0);
    const [thresholdUsd, setThresholdUsd] = useState(100_000);
    const [reloadKey, setReloadKey] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const wsUrl = useMemo(
        () =>
            marketType === "futures"
                ? `wss://fstream.binance.com/ws/${pairLower}@aggTrade`
                : `wss://stream.binance.com:9443/ws/${pairLower}@aggTrade`,
        [marketType, pairLower],
    );

    if (isMockUniverse) {
        return (
            <div className="flex-1 min-h-0 flex items-center justify-center text-center px-6">
                <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                        Mock stock mode
                    </p>
                    <p className="text-[12px] text-muted">
                        Smart Money stream sẽ dùng nguồn stock thật ở phase tiếp theo.
                    </p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        if (reconnectRef.current) {
            clearTimeout(reconnectRef.current);
            reconnectRef.current = null;
        }
        wsRef.current?.close();
        wsRef.current = null;

        setStatus("connecting");
        setReceivedCount(0);
        setRows([]);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus("connected");
        };

        ws.onerror = () => {
            setStatus("error");
        };

        ws.onclose = () => {
            setStatus("disconnected");
            reconnectRef.current = setTimeout(() => {
                setReloadKey((prev) => prev + 1);
            }, 1200);
        };

        ws.onmessage = (ev) => {
            try {
                const msg =
                    typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
                if (!msg || msg.e !== "aggTrade") return;
                const price = n(msg.p);
                const qty = n(msg.q);
                const ts = n(msg.T);
                if (price === null || qty === null) return;
                const usdValue = price * qty;
                if (usdValue < thresholdUsd) return;

                setReceivedCount((prev) => prev + 1);
                const side: "buy" | "sell" = Boolean(msg.m) ? "sell" : "buy";
                const tradeTime = ts ?? Date.now();
                const id = `${pair}-${msg.a ?? tradeTime}-${price}-${qty}-${side}`;
                const next: WhaleTrade = {
                    id,
                    timeLabel: new Date(tradeTime).toLocaleTimeString("en-GB", {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    }),
                    symbol: pair,
                    side,
                    price,
                    qty,
                    usdValue,
                };
                setRows((prev) => [next, ...prev].slice(0, MAX_ROWS));
            } catch {
                // Ignore malformed frames.
            }
        };

        return () => {
            if (reconnectRef.current) {
                clearTimeout(reconnectRef.current);
                reconnectRef.current = null;
            }
            ws.close();
        };
    }, [pair, thresholdUsd, wsUrl, reloadKey]);

    const statusMeta =
        status === "connected"
            ? {
                  label: "Live",
                  dot: "bg-emerald-500 animate-pulse",
                  tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
              }
            : status === "error"
              ? {
                    label: "Error",
                    dot: "bg-rose-500",
                    tone: "border-rose-500/25 bg-rose-500/10 text-rose-500",
                }
              : status === "disconnected"
                ? {
                      label: "Reconnecting",
                      dot: "bg-sky-500 animate-pulse",
                      tone: "border-sky-500/25 bg-sky-500/10 text-sky-500",
                  }
                : {
                      label: "Connecting",
                      dot: "bg-amber-400 animate-pulse",
                      tone: "border-amber-400/25 bg-amber-400/10 text-amber-400",
                  };

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-main">
            <div className="px-4 py-3 border-b border-main bg-secondary/10 space-y-3 shrink-0">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Waves size={14} className="text-accent" />
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-main">
                            Smart Money Signals
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setReloadKey((prev) => prev + 1)}
                        className="px-2.5 py-1.5 rounded-md border border-main bg-main text-muted hover:text-main hover:bg-secondary transition-colors text-[10px] font-semibold inline-flex items-center gap-1.5"
                    >
                        <RefreshCw size={11} />
                        Reconnect
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-md border border-main bg-main/60 px-2.5 py-1.5">
                        <div className="text-[9px] uppercase tracking-wide text-muted">
                            Pair
                        </div>
                        <div className="mt-0.5 text-[11px] font-mono text-main">
                            {pair} ({marketType})
                        </div>
                    </div>
                    <div className="rounded-md border border-main bg-main/60 px-2.5 py-1.5">
                        <div className="text-[9px] uppercase tracking-wide text-muted">
                            Stream
                        </div>
                        <div className="mt-0.5 text-[11px] font-mono text-main">
                            {pairLower}@aggTrade
                        </div>
                    </div>
                    <div className="rounded-md border border-main bg-main/60 px-2.5 py-1.5">
                        <div className="text-[9px] uppercase tracking-wide text-muted">
                            Whale Signals
                        </div>
                        <div className="mt-0.5 text-[11px] font-mono text-main">
                            {receivedCount}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div
                        className={cn(
                            "inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-wide",
                            statusMeta.tone,
                        )}
                    >
                        <Radio size={11} />
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
                        {statusMeta.label}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {[50_000, 100_000, 250_000, 500_000].map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setThresholdUsd(v)}
                                className={cn(
                                    "px-2 py-1 rounded-md border text-[10px] font-semibold transition-colors",
                                    thresholdUsd === v
                                        ? "border-accent/40 bg-accent/10 text-accent"
                                        : "border-main bg-main text-muted hover:text-main hover:bg-secondary",
                                )}
                            >
                                {usdFmt(v)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto thin-scrollbar">
                <div className="min-w-[860px]">
                    <div className="sticky top-0 z-10 grid grid-cols-[90px_120px_92px_140px_120px_140px] gap-x-3 px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-muted border-y border-main bg-secondary/90 backdrop-blur">
                        <span>Time</span>
                        <span>Symbol</span>
                        <span>Side</span>
                        <span className="text-right">Price</span>
                        <span className="text-right">Qty</span>
                        <span className="text-right">Notional</span>
                    </div>

                    {rows.length === 0 ? (
                        <div className="min-h-[280px] flex items-center justify-center px-4 text-center text-[12px] text-muted">
                            Chưa có whale trade nào vượt ngưỡng {usdFmt(thresholdUsd)}.
                        </div>
                    ) : (
                        rows.map((row) => (
                            <div
                                key={row.id}
                                className={cn(
                                    "grid grid-cols-[90px_120px_92px_140px_120px_140px] gap-x-3 px-4 py-2 border-b border-main text-[10px] font-mono hover:bg-secondary/35 transition-colors",
                                    row.side === "buy"
                                        ? "border-l-2 border-l-emerald-500/45"
                                        : "border-l-2 border-l-rose-500/45",
                                )}
                            >
                                <span className="text-muted tabular-nums">
                                    {row.timeLabel}
                                </span>
                                <span className="text-main font-semibold">
                                    {row.symbol}
                                </span>
                                <span
                                    className={cn(
                                        "font-semibold tabular-nums",
                                        row.side === "buy"
                                            ? "text-emerald-500"
                                            : "text-rose-500",
                                    )}
                                >
                                    {row.side.toUpperCase()}
                                </span>
                                <span className="text-right text-main tabular-nums">
                                    {pxFmt(row.price)}
                                </span>
                                <span className="text-right text-main tabular-nums">
                                    {qtyFmt(row.qty)}
                                </span>
                                <span className="text-right font-semibold text-main tabular-nums">
                                    {usdFmt(row.usdValue)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
