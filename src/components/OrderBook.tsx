"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "../lib/utils";
import { useMarket } from "../context/MarketContext";
import {
    useOrderBook,
    GROUPING_OPTIONS,
    Grouping,
    suggestGrouping,
} from "../hooks/useOrderBook";
import { useRecentTrades } from "../hooks/useRecentTrades";
import { Download, Share2, MoreHorizontal, Loader2 } from "lucide-react";

const tradePriceFmt = (v: number) =>
    v < 0.001
        ? v.toFixed(6)
        : v < 1
          ? v.toFixed(4)
          : v < 100
            ? v.toFixed(3)
            : v.toLocaleString("en-US", { minimumFractionDigits: 2 });
const stockPriceFmt = (v: number) =>
    v >= 1_000
        ? v.toLocaleString("en-US", { maximumFractionDigits: 0 })
        : v.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          });

const stockQtyFmt = (v: number): string => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toFixed(0);
};

// ─── Recent Trades Panel ──────────────────────────────────────────────────────
const RecentTrades = ({
    symbol,
    marketType,
    isStock,
}: {
    symbol: string;
    marketType: "spot" | "futures";
    isStock: boolean;
}) => {
    const { trades, isLoading, error, connectionStatus } = useRecentTrades(
        symbol,
        marketType,
        300,
    );

    return (
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            <div className="px-3 py-1.5 border-b border-main bg-secondary/10 shrink-0 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-main">
                    {isStock ? "Matched Trades" : "Market Trades"}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                    <span
                        className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            connectionStatus === "connected"
                                ? "bg-emerald-500"
                                : connectionStatus === "connecting"
                                  ? "bg-amber-400 animate-pulse"
                                  : "bg-rose-500",
                        )}
                    />

                    <Link
                        href="/transactions"
                        className="px-2 py-1 rounded-md border border-main bg-main text-muted hover:text-main hover:bg-secondary transition-colors text-[10px] font-semibold"
                    >
                        View details
                    </Link>
                </div>
            </div>
            {/* Column headers */}
            <div className="grid grid-cols-3 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted border-b border-main bg-secondary/10 shrink-0">
                <span>{isStock ? "Price (VND)" : "Price (USDT)"}</span>
                <span className="text-center">
                    {isStock ? "Volume" : "Qty"}
                </span>
                <span className="text-right">Time</span>
            </div>
            {/* Rows */}
            <div className="flex-1 overflow-y-auto thin-scrollbar">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center text-muted">
                        <Loader2 size={12} className="animate-spin" />
                    </div>
                ) : error ? (
                    <div className="h-full flex items-center justify-center text-[11px] text-rose-500 px-3 text-center">
                        <Loader2 size={12} className="animate-spin" />
                    </div>
                ) : trades.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[11px] text-muted">
                        Không có dữ liệu trades.
                    </div>
                ) : (
                    trades.map((t) => (
                        <div
                            key={t.id}
                            className="grid grid-cols-3 px-3 py-[3px] border-b border-main last:border-0 hover:bg-secondary"
                        >
                            <span
                                className={cn(
                                    "text-[10px] font-mono font-medium tabular-nums",
                                    t.isBuy
                                        ? "text-emerald-500"
                                        : "text-rose-500",
                                )}
                            >
                                {isStock
                                    ? stockPriceFmt(t.price)
                                    : tradePriceFmt(t.price)}
                            </span>
                            <span className="text-center text-[10px] font-mono tabular-nums text-muted">
                                {isStock
                                    ? stockQtyFmt(t.qty)
                                    : t.qty.toFixed(4)}
                            </span>
                            <span className="text-right  text-[10px] font-mono tabular-nums text-muted">
                                {new Date(t.time).toLocaleTimeString("en", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                })}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// ─── Formatters ──────────────────────────────────────────────────────────────
const priceFmt = (v: number, grouping: Grouping): string => {
    if (grouping >= 1)
        return v.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    if (grouping >= 0.1)
        return v.toLocaleString("en-US", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        });
    return v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const qtyFmt = (v: number): string => {
    if (v >= 10000)
        return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (v >= 100) return v.toFixed(2);
    if (v >= 1) return v.toFixed(4);
    return v.toFixed(6);
};

const topOfBookPriceFmt = (v: number): string => {
    if (!Number.isFinite(v)) return "—";
    if (v >= 1000) {
        return v.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }
    if (v >= 1) {
        return v.toLocaleString("en-US", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        });
    }
    return v.toLocaleString("en-US", {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6,
    });
};

function csvEscape(value: string): string {
    if (/[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

// ─── Single Order Row ─────────────────────────────────────────────────────────
interface OrderRowProps {
    price: number;
    quantity: number;
    total: number;
    depth: number;
    side: "bid" | "ask";
    grouping: Grouping;
}

const OrderRow = ({
    price,
    quantity,
    total,
    depth,
    side,
    grouping,
}: OrderRowProps) => (
    <div className="relative flex items-center px-3 py-[3px] hover:bg-secondary/60 cursor-pointer group">
        {/* Depth bar background */}
        <div
            className={cn(
                "absolute top-0 bottom-0 pointer-events-none opacity-20",
                side === "ask"
                    ? "bg-rose-500 right-0"
                    : "bg-emerald-500 left-0",
            )}
            style={{ width: `${Math.max(2, depth * 100)}%` }}
        />
        <span
            className={cn(
                "flex-1 text-[11px] font-mono relative z-10",
                side === "ask" ? "text-rose-500" : "text-emerald-500",
            )}
        >
            {priceFmt(price, grouping)}
        </span>
        <span className="flex-1 text-right text-[11px] font-mono relative z-10 text-main">
            {qtyFmt(quantity)}
        </span>
        <span className="flex-1 text-right text-[11px] font-mono relative z-10 text-muted">
            {qtyFmt(total)}
        </span>
    </div>
);

// ─── Column Header ────────────────────────────────────────────────────────────
const ColHeader = ({ baseSymbol }: { baseSymbol: string }) => (
    <div className="flex items-center px-3 py-1 text-muted bg-secondary/20">
        <span className="flex-1 text-[9px] font-bold uppercase tracking-wider">
            Price
        </span>
        <span className="flex-1 text-right text-[9px] font-bold uppercase tracking-wider">
            Qty ({baseSymbol})
        </span>
        <span className="flex-1 text-right text-[9px] font-bold uppercase tracking-wider">
            Total
        </span>
    </div>
);

// ─── OrderBook Component ──────────────────────────────────────────────────────
export const OrderBook = () => {
    const { selectedSymbol, assets, marketType, universe } = useMarket();
    const isStock = universe === "stock";
    const currentAsset = assets.find((a) => a.id === selectedSymbol);
    const baseSymbol = (currentAsset?.symbol ?? selectedSymbol).replace(
        /USDT|-C|-F/gi,
        "",
    );

    // Smart default grouping based on price
    const [grouping, setGrouping] = useState<Grouping>(1);
    const [isUserGrouping, setIsUserGrouping] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    // Update default grouping when price changes
    useEffect(() => {
        if (!isUserGrouping && currentAsset?.price) {
            setGrouping(suggestGrouping(currentAsset.price));
        }
    }, [currentAsset?.price, isUserGrouping]);

    // When switching symbols, allow auto-suggest again
    useEffect(() => {
        setIsUserGrouping(false);
    }, [selectedSymbol]);

    const {
        data,
        metrics,
        isLoading,
        error,
        connectionStatus,
        lastUpdatedAt,
        refetch,
    } = useOrderBook(selectedSymbol, grouping, marketType);

    const asksReversed = data ? [...data.asks].reverse() : [];
    const canExport = Boolean(data && !isLoading && !isStock);

    useEffect(() => {
        if (!actionMessage) return;
        const id = window.setTimeout(() => setActionMessage(null), 2000);
        return () => window.clearTimeout(id);
    }, [actionMessage]);

    const handleDownload = useCallback(() => {
        if (!data) {
            setActionMessage("No data to download");
            return;
        }
        const nowIso = new Date().toISOString();
        const rows: string[] = [
            [
                "side",
                "price",
                "quantity",
                "total",
                "depth",
                "symbol",
                "marketType",
                "grouping",
                "timestamp",
            ].join(","),
        ];

        data.asks.forEach((row) => {
            rows.push(
                [
                    "ask",
                    row.price.toString(),
                    row.quantity.toString(),
                    row.total.toString(),
                    row.depth.toString(),
                    csvEscape(selectedSymbol),
                    marketType,
                    grouping.toString(),
                    nowIso,
                ].join(","),
            );
        });
        data.bids.forEach((row) => {
            rows.push(
                [
                    "bid",
                    row.price.toString(),
                    row.quantity.toString(),
                    row.total.toString(),
                    row.depth.toString(),
                    csvEscape(selectedSymbol),
                    marketType,
                    grouping.toString(),
                    nowIso,
                ].join(","),
            );
        });

        const csv = rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safeSymbol = selectedSymbol.replace(/[^a-zA-Z0-9_-]/g, "_");
        const safeGrouping = grouping.toString().replace(".", "_");
        a.href = url;
        a.download = `orderbook_${safeSymbol}_${marketType}_g${safeGrouping}_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setActionMessage("Downloaded");
    }, [data, grouping, marketType, selectedSymbol]);

    const copyTextToClipboard = useCallback(async (text: string) => {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
    }, []);

    const handleShare = useCallback(async () => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set("symbol", selectedSymbol);
            url.searchParams.set("marketType", marketType);
            url.searchParams.set("grouping", grouping.toString());
            await copyTextToClipboard(url.toString());
            setActionMessage("Link copied");
        } catch {
            setActionMessage("Copy failed");
        }
    }, [copyTextToClipboard, grouping, marketType, selectedSymbol]);

    return (
        <div className="h-full flex flex-col border-t border-main">
            {/* 3-column layout: Trades (left) | OrderBook (center) | Depth (right) */}
            <div className="flex-1 min-h-0 flex overflow-hidden bg-main">
                <div className="w-[30%] min-w-[240px] max-w-[360px] border-r border-main min-h-0 bg-main flex flex-col overflow-hidden">
                    <RecentTrades
                        symbol={selectedSymbol}
                        marketType={marketType}
                        isStock={isStock}
                    />
                </div>

                <div className="flex-1 border-r border-main flex flex-col min-h-0 bg-main">
                    {/* Header */}
                    <div className="px-3 py-1.5 border-b border-main bg-secondary/10 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-main">
                                {isStock ? "Stock Order Book" : "Order Book"}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-0.5 rounded-md bg-secondary/20 p-0.5">
                                {GROUPING_OPTIONS.map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => {
                                            setIsUserGrouping(true);
                                            setGrouping(g);
                                        }}
                                        className={cn(
                                            "h-5 rounded px-1.5 text-[9px] font-mono font-semibold tracking-wide transition-colors",
                                            grouping === g
                                                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                                                : "text-muted hover:text-main hover:bg-secondary",
                                        )}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleDownload}
                                disabled={!canExport}
                                className={cn(
                                    "p-1 text-muted hover:text-main",
                                    !canExport && "opacity-50 cursor-not-allowed",
                                )}
                                title="Download"
                            >
                                <Download size={11} />
                            </button>
                            <button
                                onClick={() => void handleShare()}
                                className="p-1 text-muted hover:text-main"
                                title="Share"
                            >
                                <Share2 size={11} />
                            </button>
                            <button className="p-1 text-muted hover:text-main">
                                <MoreHorizontal size={11} />
                            </button>
                            {actionMessage && (
                                <span className="text-[9px] text-muted font-medium pl-1">
                                    {actionMessage}
                                </span>
                            )}
                        </div>
                    </div>
                    <ColHeader baseSymbol={isStock ? "CP" : baseSymbol} />

                    {isStock ? (
                        <div className="flex-1 flex items-center justify-center p-4">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-amber-400">
                                Soon
                            </div>
                        </div>
                    ) : isLoading && !data ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2
                                size={12}
                                className="text-muted animate-spin"
                            />
                        </div>
                    ) : !data && error ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center">
                            <div className="text-[11px] text-rose-500">
                                {error}
                            </div>
                            <button
                                onClick={() => void refetch()}
                                className="px-2 py-1 rounded-md border border-main bg-main text-muted hover:text-main hover:bg-secondary transition-colors text-[10px] font-semibold"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto thin-scrollbar flex flex-col">
                            <div className="flex-1 flex flex-col justify-end">
                                {asksReversed.map((ask) => (
                                    <OrderRow
                                        key={ask.price}
                                        {...ask}
                                        side="ask"
                                        grouping={grouping}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/50 border-y border-main shrink-0">
                                <div className="flex items-center space-x-2">
                                    <span
                                        className={cn(
                                            "text-[14px] font-mono font-semibold",
                                            (currentAsset?.changePercent ??
                                                0) >= 0
                                                ? "text-emerald-500"
                                                : "text-rose-500",
                                        )}
                                    >
                                        {currentAsset?.price
                                            ? priceFmt(
                                                  currentAsset.price,
                                                  grouping < 1 ? grouping : 1,
                                              )
                                            : "—"}
                                    </span>
                                    {(currentAsset?.changePercent ?? 0) >= 0 ? (
                                        <span className="text-emerald-500 text-[10px]">
                                            ↑
                                        </span>
                                    ) : (
                                        <span className="text-rose-500 text-[10px]">
                                            ↓
                                        </span>
                                    )}
                                </div>
                                {data && (
                                    <span className="text-[9px] text-muted font-mono">
                                        Spread:{" "}
                                        {priceFmt(data.spread, grouping)} (
                                        {data.spreadPercent.toFixed(3)}%)
                                    </span>
                                )}
                                {lastUpdatedAt && (
                                    <span className="text-[9px] text-muted font-mono">
                                        {new Date(
                                            lastUpdatedAt,
                                        ).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col">
                                {(data?.bids ?? []).map((bid) => (
                                    <OrderRow
                                        key={bid.price}
                                        {...bid}
                                        side="bid"
                                        grouping={grouping}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-[20%] min-w-[200px] max-w-[280px] flex flex-col bg-secondary/10 shrink-0">
                    {/* Header */}
                    <div className="px-3 py-2.5 border-b border-main bg-secondary/10 shrink-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-main">
                            {isStock
                                ? `${baseSymbol} VN Depth`
                                : `${baseSymbol} Depth`}
                        </span>
                    </div>
                    <div className="flex-1 min-h-0 p-3 overflow-y-auto thin-scrollbar">
                        {isStock ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-[10px] uppercase tracking-widest font-bold text-amber-400">
                                    Soon
                                </div>
                            </div>
                        ) : data && metrics ? (
                            <div className="space-y-3">
                                <div className="rounded-lg border border-main bg-main/40 p-3">
                                    <div className="flex items-center justify-between min-w-0">
                                        <span className="text-[9px] uppercase tracking-widest text-muted">
                                            Total Depth
                                        </span>
                                        <span className="text-[9px] text-muted font-mono truncate max-w-[55%]">
                                            {qtyFmt(
                                                metrics.bidVolume +
                                                    metrics.askVolume,
                                            )}
                                        </span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-left min-w-0">
                                            <div className="text-[9px] uppercase tracking-wider text-emerald-400">
                                                Bids
                                            </div>
                                            <div className="text-[12px] font-mono font-semibold text-emerald-500 truncate">
                                                {qtyFmt(metrics.bidVolume)}
                                            </div>
                                        </div>
                                        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-left min-w-0">
                                            <div className="text-[9px] uppercase tracking-wider text-rose-400">
                                                Asks
                                            </div>
                                            <div className="text-[12px] font-mono font-semibold text-rose-500 truncate">
                                                {qtyFmt(metrics.askVolume)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 h-1.5 rounded-full overflow-hidden flex bg-secondary/40">
                                        {(() => {
                                            const bidVol = metrics.bidVolume;
                                            const askVol = metrics.askVolume;
                                            const total = bidVol + askVol;
                                            const bidPct =
                                                total > 0
                                                    ? (bidVol / total) * 100
                                                    : 50;
                                            return (
                                                <>
                                                    <div
                                                        className="bg-emerald-500 h-full transition-all"
                                                        style={{
                                                            width: `${bidPct}%`,
                                                        }}
                                                    />
                                                    <div className="bg-rose-500 h-full flex-1" />
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-md border border-main bg-main/20 px-2 py-1.5 text-left">
                                        <div className="text-[9px] text-muted">
                                            Bid Qty
                                        </div>
                                        <div className="text-[11px] font-mono text-main">
                                            {qtyFmt(metrics.bestBidQty)}
                                        </div>
                                    </div>
                                    <div className="rounded-md border border-main bg-main/20 px-2 py-1.5 text-left">
                                        <div className="text-[9px] text-muted">
                                            Ask Qty
                                        </div>
                                        <div className="text-[11px] font-mono text-main">
                                            {qtyFmt(metrics.bestAskQty)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-md border border-main bg-main/20 px-2 py-1.5 text-left">
                                        <div className="text-[9px] text-muted">
                                            Spread (bps)
                                        </div>
                                        <div className="text-[11px] font-mono text-main">
                                            {metrics.spreadBps.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="rounded-md border border-main bg-main/20 px-2 py-1.5 text-left">
                                        <div className="text-[9px] text-muted">
                                            Depth tick/s
                                        </div>
                                        <div className="text-[11px] font-mono text-main">
                                            {metrics.updatesPerSec10s.toFixed(
                                                1,
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-md border border-main bg-main/30 px-2 py-1.5 text-left">
                                        <div className="text-[9px] text-muted">
                                            Best Bid
                                        </div>
                                        <div className="text-[12px] font-mono font-semibold text-emerald-500">
                                            {topOfBookPriceFmt(metrics.bestBid)}
                                        </div>
                                    </div>
                                    <div className="rounded-md border border-main bg-main/30 px-2 py-1.5 text-left">
                                        <div className="text-[9px] text-muted">
                                            Best Ask
                                        </div>
                                        <div className="text-[12px] font-mono font-semibold text-rose-500">
                                            {topOfBookPriceFmt(metrics.bestAsk)}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-md border border-main bg-main/30 px-2 py-1.5 flex items-center justify-between">
                                    <div>
                                        <div className="text-[9px] text-muted">
                                            Imbalance
                                        </div>
                                        <div
                                            className={cn(
                                                "text-[11px] font-mono font-semibold",
                                                metrics.imbalancePct >= 0
                                                    ? "text-emerald-500"
                                                    : "text-rose-500",
                                            )}
                                        >
                                            {metrics.imbalancePct >= 0
                                                ? "+"
                                                : ""}
                                            {metrics.imbalancePct.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            "text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border",
                                            metrics.imbalancePct >= 0
                                                ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                                                : "text-rose-400 border-rose-500/40 bg-rose-500/10",
                                        )}
                                    >
                                        {metrics.imbalancePct >= 0
                                            ? "Bid"
                                            : "Ask"}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-[11px] text-muted">
                                <Loader2 size={12} className="animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
