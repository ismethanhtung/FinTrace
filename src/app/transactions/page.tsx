"use client";

import PageLayout from "../../components/PageLayout";
import { LeftSidebar } from "../../components/LeftSidebar";
import {
    AlertCircle,
    ArrowDownLeft,
    ArrowUpRight,
    RefreshCw,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useMarket } from "../../context/MarketContext";
import { useTransactions } from "../../hooks/useTransactions";
import { LineChart, Line, YAxis } from "recharts";

/** Giống `OrderBook` — format giá trên tape */
const tradePriceFmt = (v: number) =>
    v < 0.001
        ? v.toFixed(6)
        : v < 1
          ? v.toFixed(4)
          : v < 100
            ? v.toFixed(3)
            : v.toLocaleString("en-US", { minimumFractionDigits: 2 });

const compactUsdFmt = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
});

function MiniTradeSparkline({
    data,
    positive,
    variant = "compact",
}: {
    data: { v: number }[];
    positive: boolean;
    variant?: "compact" | "wide";
}) {
    const w = variant === "wide" ? 320 : 112;
    const h = variant === "wide" ? 120 : 40;

    if (!data || data.length < 2) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center text-[11px] text-muted",
                    variant === "wide" ? "h-[120px] w-full max-w-[320px]" : "h-10 w-28",
                )}
            >
                --
            </div>
        );
    }

    return (
        <div
            className={cn(
                "shrink-0",
                variant === "wide" ? "w-full max-w-[320px]" : "h-10 w-28 min-w-[112px]",
            )}
        >
            <LineChart width={w} height={h} data={data}>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Line
                    type="monotone"
                    dataKey="v"
                    stroke={positive ? "var(--color-up, #22c55e)" : "var(--color-down, #ef4444)"}
                    strokeWidth={variant === "wide" ? 2 : 1.5}
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </div>
    );
}

/** 6 cột đều nhau, số căn phải */
const TRADES_GRID =
    "grid grid-cols-6 gap-x-3 px-3 items-center min-w-0";

export default function TransactionsPage() {
    const { assets, selectedSymbol, setSelectedSymbol, marketType } =
        useMarket();
    const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");

    const {
        transactions: txList,
        isLoading: tradesLoading,
        isRefreshing,
        error: tradeError,
        refetch,
    } = useTransactions({
        symbol: selectedSymbol,
        marketType,
        limit: 500,
        pollingMs: 2000,
    });

    useEffect(() => {
        if (!assets.length) return;
        if (assets.some((a) => a.id === selectedSymbol)) return;
        setSelectedSymbol(assets[0].id);
    }, [assets, selectedSymbol, setSelectedSymbol]);

    const filtered = useMemo(() => {
        if (filter === "all") return txList;
        return txList.filter((t) => (filter === "buy" ? t.isBuy : !t.isBuy));
    }, [filter, txList]);

    const stats = useMemo(() => {
        const len = filtered.length;
        let buyCount = 0;
        let sellCount = 0;
        let totalQty = 0;
        let totalQuote = 0;
        let buyQuote = 0;
        let sellQuote = 0;
        let high = -Infinity;
        let low = Infinity;

        for (const t of filtered) {
            totalQty += t.qty;
            totalQuote += t.quoteQty;
            if (t.isBuy) {
                buyCount++;
                buyQuote += t.quoteQty;
            } else {
                sellCount++;
                sellQuote += t.quoteQty;
            }
            if (t.price > high) high = t.price;
            if (t.price < low) low = t.price;
        }

        const vwap = totalQty > 0 ? totalQuote / totalQty : 0;
        const positive = len >= 2 ? filtered[0].price >= filtered[len - 1].price : true;
        const chartData = filtered
            .slice()
            .reverse()
            .slice(Math.max(0, filtered.length - 60))
            .map((t) => ({ v: t.price }));

        return {
            len,
            buyCount,
            sellCount,
            totalQuote,
            buyQuote,
            sellQuote,
            high: len ? high : 0,
            low: len ? low : 0,
            vwap,
            positive,
            chartData,
        };
    }, [filtered]);

    const showFullLoading = tradesLoading && txList.length === 0 && !tradeError;

    return (
        <PageLayout title="Transactions" wide>
            <div className="flex flex-col gap-4 min-h-0">
                {/* Khung giống layout chart + sidebar: cao viewport, hai cột scroll nội bộ */}
                <div className="flex rounded-xl border border-main overflow-hidden bg-main min-h-[min(720px,calc(100dvh-7.5rem))] h-[min(720px,calc(100dvh-7.5rem))]">
                    <LeftSidebar embedded />

                    <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-main">
                        {/* Filter — không thay thế header tape */}
                        <div className="px-3 py-2 border-b border-main bg-secondary/10 shrink-0 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[10px] text-muted font-mono truncate">
                                {selectedSymbol}
                                {tradeError && txList.length > 0 ? (
                                    <span className="text-amber-500 ml-2">
                                        • Poll lỗi, đang giữ dữ liệu cũ
                                    </span>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-1">
                                {(["all", "buy", "sell"] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setFilter(t)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-colors",
                                            filter === t
                                                ? "bg-accent/15 text-accent border-accent/30"
                                                : "border-transparent text-muted hover:text-main hover:bg-secondary",
                                        )}
                                    >
                                        {t === "all"
                                            ? "All"
                                            : t === "buy"
                                              ? "Buy"
                                              : "Sell"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Market Trades — cùng markup/class với OrderBook RecentTrades */}
                        <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
                            <div className="flex-1 min-h-0 min-w-0 overflow-x-auto flex flex-col">
                                <div className="min-w-[720px] flex flex-col flex-1 min-h-0 min-w-0">
                            <div className="px-3 py-3 border-b border-main bg-secondary/10 shrink-0 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-main">
                                    Market Trades
                                </span>
                                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                            </div>

                            <div
                                className={cn(
                                    TRADES_GRID,
                                    "py-2 text-[9px] font-semibold uppercase tracking-wider text-muted border-b border-main bg-secondary/10 shrink-0",
                                )}
                            >
                                <span className="text-left">Type</span>
                                <span className="text-right">ID</span>
                                <span className="text-right">Price (USDT)</span>
                                <span className="text-right">Qty</span>
                                <span className="text-right">Total (USDT)</span>
                                <span className="text-right">Time</span>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
                                {tradeError && txList.length === 0 ? (
                                    <div className="h-full flex items-center justify-center gap-2 text-[11px] text-rose-500 px-3 text-center">
                                        <AlertCircle
                                            size={14}
                                            className="shrink-0"
                                        />
                                        <span>
                                            Lỗi tải trades: {tradeError}
                                        </span>
                                    </div>
                                ) : showFullLoading ? (
                                    <div className="h-full flex items-center justify-center text-[11px] text-muted">
                                        Đang tải trades...
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-[11px] text-muted">
                                        Không có dữ liệu trades.
                                    </div>
                                ) : (
                                    filtered.map((t) => (
                                        <div
                                            key={`${t.pair}-${t.id}-${t.timeMs}`}
                                            className={cn(
                                                TRADES_GRID,
                                                "py-[3px] border-b border-main last:border-0 hover:bg-secondary",
                                            )}
                                        >
                                            <div className="min-w-0 flex justify-start">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono tabular-nums",
                                                        t.isBuy
                                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                            : "bg-rose-500/10 text-rose-500 border-rose-500/20",
                                                    )}
                                                >
                                                    {t.isBuy ? (
                                                        <ArrowDownLeft
                                                            size={12}
                                                            className="shrink-0"
                                                        />
                                                    ) : (
                                                        <ArrowUpRight
                                                            size={12}
                                                            className="shrink-0"
                                                        />
                                                    )}
                                                    {t.isBuy ? "BUY" : "SELL"}
                                                </span>
                                            </div>
                                            <span className="text-right text-[10px] font-mono tabular-nums text-muted truncate">
                                                {t.id}
                                            </span>
                                            <span className="text-right text-[10px] font-mono font-semibold tabular-nums text-main">
                                                {tradePriceFmt(t.price)}
                                            </span>
                                            <span className="text-right text-[10px] font-mono tabular-nums text-muted">
                                                {t.qty.toFixed(4)}
                                            </span>
                                            <span className="text-right text-[10px] font-mono font-semibold tabular-nums text-main">
                                                ${compactUsdFmt.format(
                                                    t.quoteQty,
                                                )}
                                            </span>
                                            <span className="text-right text-[10px] font-mono tabular-nums text-muted whitespace-nowrap">
                                                {t.timeLabel}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tóm tắt + chart — dưới khung chính */}
                <div className="rounded-xl border border-main bg-secondary/10 p-4 sm:p-5">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-4">
                        Tóm tắt tape (theo bộ lọc All / Buy / Sell)
                    </div>
                    <div className="flex flex-col xl:flex-row xl:items-stretch xl:justify-between gap-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 min-w-0">
                            <div className="rounded-lg border border-main bg-main px-3 py-2.5">
                                <div className="text-[9px] text-muted uppercase tracking-widest font-bold mb-1">
                                    Total
                                </div>
                                <div className="text-[14px] font-mono font-semibold tabular-nums">
                                    ${compactUsdFmt.format(stats.totalQuote)}
                                </div>
                            </div>
                            <div className="rounded-lg border border-main bg-main px-3 py-2.5">
                                <div className="text-[9px] text-muted uppercase tracking-widest font-bold mb-1">
                                    VWAP
                                </div>
                                <div className="text-[14px] font-mono font-semibold tabular-nums">
                                    {stats.vwap
                                        ? `$${tradePriceFmt(stats.vwap)}`
                                        : "--"}
                                </div>
                            </div>
                            <div className="rounded-lg border border-main bg-main px-3 py-2.5 lg:col-span-2">
                                <div className="text-[9px] text-muted uppercase tracking-widest font-bold mb-1">
                                    Range
                                </div>
                                <div className="text-[13px] font-mono font-semibold tabular-nums break-words">
                                    {stats.len
                                        ? `$${tradePriceFmt(stats.low)}`
                                        : "--"}{" "}
                                    <span className="text-muted">—</span>{" "}
                                    {stats.len
                                        ? `$${tradePriceFmt(stats.high)}`
                                        : "--"}
                                </div>
                            </div>
                            <div className="rounded-lg border border-main bg-main px-3 py-2.5 col-span-2 lg:col-span-4">
                                <div className="text-[9px] text-muted uppercase tracking-widest font-bold mb-1">
                                    Đếm lệnh
                                </div>
                                <div className="text-[14px] font-mono font-semibold tabular-nums">
                                    <span className="text-emerald-500">
                                        {stats.buyCount}B
                                    </span>
                                    <span className="text-muted mx-1">/</span>
                                    <span className="text-rose-500">
                                        {stats.sellCount}S
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-stretch sm:items-center xl:items-end gap-2">
                            <div className="text-[9px] text-muted uppercase tracking-widest font-bold text-center xl:text-right">
                                Giá (60 tick gần nhất)
                            </div>
                            <div className="flex justify-center xl:justify-end w-full">
                                <MiniTradeSparkline
                                    data={stats.chartData}
                                    positive={stats.positive}
                                    variant="wide"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
