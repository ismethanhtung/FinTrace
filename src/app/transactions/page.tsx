"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    ArrowDown,
    ArrowDownLeft,
    ArrowUp,
    ArrowUpRight,
    BarChart3,
    Gauge,
    Loader2,
    Sigma,
} from "lucide-react";
import {
    Line,
    LineChart,
    ReferenceLine,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { LeftSidebar } from "../../components/LeftSidebar";
import { AppTopBar } from "../../components/shell/AppTopBar";
import { cn } from "../../lib/utils";
import { useMarket } from "../../context/MarketContext";
import { useTransactions } from "../../hooks/useTransactions";
import { useI18n } from "../../context/I18nContext";

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

const TRADES_GRID =
    "grid grid-cols-[90px_110px_1fr_1fr_1fr_110px] gap-x-3 px-3 items-center min-w-[760px]";

type FilterKind = "all" | "buy" | "sell";

export default function TransactionsPage() {
    const { t } = useI18n();
    const { assets, selectedSymbol, setSelectedSymbol, marketType, universe } =
        useMarket();
    const isStock = universe === "stock";
    const [filter, setFilter] = useState<FilterKind>("all");

    const {
        transactions: txList,
        isLoading: tradesLoading,
        isRefreshing,
        error: tradeError,
        refetch,
    } = useTransactions({
        symbol: selectedSymbol,
        marketType,
        limit: 800,
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
        const positive =
            len >= 2 ? filtered[0].price >= filtered[len - 1].price : true;

        const priceSeries = filtered
            .slice()
            .reverse()
            .slice(Math.max(0, filtered.length - 280));
        const chartData = priceSeries.map((t, i, arr) => {
            const start = Math.max(0, i - 19);
            const window = arr.slice(start, i + 1);
            const ma =
                window.reduce((sum, item) => sum + item.price, 0) /
                Math.max(1, window.length);
            return {
                idx: i + 1,
                v: t.price,
                ma,
                timeLabel: t.timeLabel,
                quote: t.quoteQty,
            };
        });

        const firstChart = chartData[0]?.v ?? 0;
        const lastChart = chartData[chartData.length - 1]?.v ?? 0;
        const trendPct =
            firstChart > 0 ? ((lastChart - firstChart) / firstChart) * 100 : 0;

        const latestTs = filtered[0]?.timeMs ?? 0;
        const recent60s = latestTs
            ? filtered.filter((t) => latestTs - t.timeMs <= 60_000)
            : [];
        const recentNotional = recent60s.reduce(
            (sum, t) => sum + t.quoteQty,
            0,
        );

        const imbalancePct =
            totalQuote > 0 ? ((buyQuote - sellQuote) / totalQuote) * 100 : 0;
        const buyDominance = totalQuote > 0 ? (buyQuote / totalQuote) * 100 : 0;

        const sizeBuckets = [
            { label: t("transactionsPage.bucketMicro"), min: 0, max: 1_000 },
            { label: t("transactionsPage.bucketSmall"), min: 1_000, max: 10_000 },
            {
                label: t("transactionsPage.bucketMedium"),
                min: 10_000,
                max: 100_000,
            },
            {
                label: t("transactionsPage.bucketLarge"),
                min: 100_000,
                max: Number.POSITIVE_INFINITY,
            },
        ].map((bucket) => {
            const items = filtered.filter(
                (t) => t.quoteQty >= bucket.min && t.quoteQty < bucket.max,
            );
            const notional = items.reduce((sum, t) => sum + t.quoteQty, 0);
            const ratio = totalQuote > 0 ? (notional / totalQuote) * 100 : 0;
            return {
                ...bucket,
                count: items.length,
                notional,
                ratio,
            };
        });

        const bigPrints = filtered
            .slice()
            .sort((a, b) => b.quoteQty - a.quoteQty)
            .slice(0, 12);

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
            chartPoints: chartData.length,
            trendPct,
            recentNotional,
            recentTrades: recent60s.length,
            imbalancePct,
            buyDominance,
            sizeBuckets,
            bigPrints,
        };
    }, [filtered, t]);

    const showFullLoading = tradesLoading && txList.length === 0 && !tradeError;

    return (
        <div className="h-screen w-full bg-main text-main overflow-hidden flex flex-col">
            <AppTopBar
                onRefresh={refetch}
                isRefreshing={isRefreshing}
                refreshTitle={t("transactionsPage.reloadTransactions")}
                refreshAriaLabel={t("transactionsPage.reloadTransactions")}
                headerClassName="sticky top-0"
            />

            <main className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_430px]">
                <div className="min-h-0 border-r border-main bg-main">
                    <LeftSidebar embedded />
                </div>

                <section className="min-h-0 min-w-0 flex flex-col border-r border-main bg-main">
                    <div className="px-4 border-b border-main bg-gradient-to-r from-secondary/25 via-secondary/10 to-transparent shrink-0 h-[56px] flex items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-main">
                                    {isStock
                                        ? t("transactionsPage.matchedTrades")
                                        : t("transactionsPage.marketTrades")}
                                </span>
                                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                            </div>
                            <div className="text-[11px] text-muted font-mono whitespace-nowrap">
                                {selectedSymbol} ·{" "}
                                {isStock
                                    ? t("transactionsPage.stock")
                                    : marketType.toUpperCase()}{" "}
                                · {t("transactionsPage.rows", { count: filtered.length })}
                                {tradeError && txList.length > 0 ? (
                                    <span className="text-amber-500 ml-2">
                                        • {t("transactionsPage.pollErrorKeepOldData")}
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {(["all", "buy", "sell"] as const).map((kind) => (
                                <button
                                    key={kind}
                                    type="button"
                                    onClick={() => setFilter(kind)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-colors",
                                        filter === kind
                                            ? "bg-accent/15 text-accent border-accent/30"
                                            : "border-transparent text-muted hover:text-main hover:bg-secondary",
                                    )}
                                >
                                    {kind === "all"
                                        ? t("transactionsPage.filterAll")
                                        : kind === "buy"
                                          ? t("transactionsPage.filterBuy")
                                          : t("transactionsPage.filterSell")}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div
                        className={cn(
                            TRADES_GRID,
                            "py-2 text-[9px] font-semibold uppercase tracking-wider text-muted border-b border-main bg-secondary/10 shrink-0",
                        )}
                    >
                        <span className="text-left">{t("transactionsPage.type")}</span>
                        <span className="text-right">{t("transactionsPage.id")}</span>
                        <span className="text-right">
                            {t("transactionsPage.price")} ({isStock ? "VND" : "USDT"})
                        </span>
                        <span className="text-right">{t("transactionsPage.qty")}</span>
                        <span className="text-right">{t("transactionsPage.notional")}</span>
                        <span className="text-right">{t("transactionsPage.time")}</span>
                    </div>

                    <div className="flex-1 min-h-0 overflow-x-auto">
                        <div className="min-h-full min-w-[760px] overflow-y-auto thin-scrollbar">
                            {tradeError && txList.length === 0 ? (
                                <div className="h-full flex items-center justify-center gap-2 text-[11px] text-rose-500 px-3 text-center">
                                    <AlertCircle
                                        size={14}
                                        className="shrink-0"
                                    />

                                    <Loader2
                                        size={12}
                                        className="animate-spin"
                                    />
                                </div>
                            ) : showFullLoading ? (
                                <div className="h-full flex items-center justify-center text-[11px] text-muted">
                                    <Loader2
                                        size={12}
                                        className="animate-spin"
                                    />
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-[11px] text-muted">
                                    {t("transactionsPage.noTradeData")}
                                </div>
                            ) : (
                                filtered.map((tx) => (
                                    <div
                                        key={`${tx.pair}-${tx.id}-${tx.timeMs}`}
                                        className={cn(
                                            TRADES_GRID,
                                            "py-[4px] border-b border-main last:border-0 hover:bg-secondary/40 transition-colors",
                                        )}
                                    >
                                        <div className="min-w-0 flex justify-start">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono tabular-nums",
                                                    tx.isBuy
                                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                        : "bg-rose-500/10 text-rose-500 border-rose-500/20",
                                                )}
                                            >
                                                {tx.isBuy ? (
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
                                                {tx.isBuy
                                                    ? t("transactionsPage.buy")
                                                    : t("transactionsPage.sell")}
                                            </span>
                                        </div>
                                        <span className="text-right text-[10px] font-mono tabular-nums text-muted truncate">
                                            {tx.id}
                                        </span>
                                        <span className="text-right text-[10px] font-mono font-semibold tabular-nums text-main">
                                            {tradePriceFmt(tx.price)}
                                        </span>
                                        <span className="text-right text-[10px] font-mono tabular-nums text-muted">
                                            {isStock
                                                ? tx.qty.toLocaleString(
                                                      "en-US",
                                                      {
                                                          maximumFractionDigits: 0,
                                                      },
                                                  )
                                                : tx.qty.toFixed(4)}
                                        </span>
                                        <span className="text-right text-[10px] font-mono font-semibold tabular-nums text-main">
                                            {isStock ? "" : "$"}
                                            {compactUsdFmt.format(tx.quoteQty)}
                                        </span>
                                        <span className="text-right text-[10px] font-mono tabular-nums text-muted whitespace-nowrap">
                                            {tx.timeLabel}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                <aside className="min-h-0 bg-main flex flex-col">
                    <div className="px-4 border-b border-main shrink-0 h-[56px] flex flex-col justify-center">
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-main">
                            {t("transactionsPage.tapeSummary")}
                        </div>
                        <div className="text-[10px] text-muted mt-1 whitespace-nowrap">
                            {t("transactionsPage.tapeSummaryHint", {
                                symbol: selectedSymbol,
                            })}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <StatCard
                                label={t("transactionsPage.totalNotional")}
                                value={`${isStock ? "" : "$"}${compactUsdFmt.format(stats.totalQuote)}`}
                                icon={<Sigma size={12} />}
                            />
                            <StatCard
                                label={t("transactionsPage.vwap")}
                                value={
                                    stats.vwap
                                        ? `${isStock ? "" : "$"}${tradePriceFmt(stats.vwap)}`
                                        : "--"
                                }
                                icon={<BarChart3 size={12} />}
                            />
                            <StatCard
                                label={t("transactionsPage.last60s")}
                                value={`${isStock ? "" : "$"}${compactUsdFmt.format(stats.recentNotional)}`}
                                icon={<Gauge size={12} />}
                            />
                            <StatCard
                                label={t("transactionsPage.flowImbalance")}
                                value={`${stats.imbalancePct >= 0 ? "+" : ""}${stats.imbalancePct.toFixed(2)}%`}
                                accent={
                                    stats.imbalancePct >= 0
                                        ? "text-emerald-500"
                                        : "text-rose-500"
                                }
                                icon={
                                    stats.imbalancePct >= 0 ? (
                                        <ArrowUp size={12} />
                                    ) : (
                                        <ArrowDown size={12} />
                                    )
                                }
                            />
                        </div>

                        <div className="rounded-lg border border-main bg-secondary/10 p-3 space-y-2">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-muted">
                                <span>{t("transactionsPage.buySellDominance")}</span>
                                <span>
                                    {stats.buyDominance.toFixed(1)}%{" "}
                                    {t("transactionsPage.buy")}
                                </span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden bg-secondary">
                                <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${stats.buyDominance}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-emerald-500">
                                    {t("transactionsPage.buy")} {isStock ? "" : "$"}
                                    {compactUsdFmt.format(stats.buyQuote)}
                                </span>
                                <span className="text-rose-500">
                                    {t("transactionsPage.sell")} {isStock ? "" : "$"}
                                    {compactUsdFmt.format(stats.sellQuote)}
                                </span>
                            </div>
                            <div className="text-[10px] text-muted font-mono">
                                {t("transactionsPage.trades")}:{" "}
                                <span className="text-emerald-500">
                                    {stats.buyCount}B
                                </span>{" "}
                                /{" "}
                                <span className="text-rose-500">
                                    {stats.sellCount}S
                                </span>{" "}
                                · 60s: {stats.recentTrades}
                            </div>
                        </div>

                        <div className="rounded-lg border border-main bg-secondary/10 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] uppercase tracking-wider font-bold text-muted">
                                    {t("transactionsPage.priceAction")}
                                </div>
                                <div
                                    className={cn(
                                        "text-[10px] font-mono flex items-center gap-1",
                                        stats.trendPct >= 0
                                            ? "text-emerald-500"
                                            : "text-rose-500",
                                    )}
                                >
                                    {stats.trendPct >= 0 ? (
                                        <ArrowUp size={11} />
                                    ) : (
                                        <ArrowDown size={11} />
                                    )}
                                    {stats.trendPct >= 0 ? "+" : ""}
                                    {stats.trendPct.toFixed(2)}%
                                </div>
                            </div>
                            <SizedChartContainer className="h-52 w-full min-w-0">
                                {({ width, height }) => (
                                    <LineChart
                                        width={width}
                                        height={height}
                                        data={stats.chartData}
                                        margin={{
                                            top: 8,
                                            right: 4,
                                            left: 0,
                                            bottom: 0,
                                        }}
                                    >
                                        <XAxis dataKey="idx" hide />
                                        <YAxis
                                            hide
                                            domain={["dataMin", "dataMax"]}
                                        />
                                        {Number.isFinite(stats.vwap) &&
                                            stats.vwap > 0 && (
                                                <ReferenceLine
                                                    y={stats.vwap}
                                                    stroke="var(--color-accent, #3b82f6)"
                                                    strokeDasharray="3 3"
                                                />
                                            )}
                                        <Tooltip
                                            contentStyle={{
                                                background: "var(--bg-main)",
                                                border: "1px solid var(--border-color)",
                                                borderRadius: "6px",
                                                fontSize: "10px",
                                            }}
                                            formatter={(
                                                value: number,
                                                name,
                                            ) => [
                                                `${isStock ? "" : "$"}${tradePriceFmt(value)}`,
                                                name === "v"
                                                    ? t("transactionsPage.price")
                                                    : t("transactionsPage.ma20"),
                                            ]}
                                            labelFormatter={(label) => {
                                                const point =
                                                    stats.chartData[
                                                        Number(label) - 1
                                                    ];
                                                return point
                                                    ? `${t("transactionsPage.tick")} ${label} · ${point.timeLabel}`
                                                    : `${t("transactionsPage.tick")} ${label}`;
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="v"
                                            stroke={
                                                stats.positive
                                                    ? "var(--color-up, #22c55e)"
                                                    : "var(--color-down, #ef4444)"
                                            }
                                            strokeWidth={2}
                                            dot={false}
                                            isAnimationActive={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="ma"
                                            stroke="var(--text-muted, #94a3b8)"
                                            strokeWidth={1.2}
                                            dot={false}
                                            isAnimationActive={false}
                                        />
                                    </LineChart>
                                )}
                            </SizedChartContainer>
                            <div className="text-[10px] text-muted font-mono">
                                {t("transactionsPage.range")}:{" "}
                                {stats.len
                                    ? `${isStock ? "" : "$"}${tradePriceFmt(stats.low)} - ${isStock ? "" : "$"}${tradePriceFmt(stats.high)}`
                                    : "--"}{" "}
                                · {t("transactionsPage.points")}:{" "}
                                {stats.chartPoints}
                            </div>
                        </div>

                        <div className="rounded-lg border border-main bg-secondary/10 p-3 space-y-2">
                            <div className="text-[10px] uppercase tracking-wider font-bold text-muted">
                                {t("transactionsPage.sizeDistribution")}
                            </div>
                            <div className="space-y-2">
                                {stats.sizeBuckets.map((bucket) => (
                                    <div
                                        key={bucket.label}
                                        className="space-y-1"
                                    >
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-muted">
                                                {bucket.label}
                                            </span>
                                            <span className="font-mono">
                                                {bucket.count} ·{" "}
                                                {(isStock ? "" : "$") +
                                                    compactUsdFmt.format(
                                                        bucket.notional,
                                                    )}
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                                            <div
                                                className="h-full bg-accent/80"
                                                style={{
                                                    width: `${bucket.ratio}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg border border-main bg-secondary/10 p-3">
                            <div className="text-[10px] uppercase tracking-wider font-bold text-muted mb-2">
                                {t("transactionsPage.topBigPrints")}
                            </div>
                            <div className="max-h-64 overflow-y-auto thin-scrollbar space-y-1">
                                {stats.bigPrints.length === 0 ? (
                                    <div className="text-[10px] text-muted">
                                        {t("transactionsPage.noLargePrints")}
                                    </div>
                                ) : (
                                    stats.bigPrints.map((tx) => (
                                        <div
                                            key={`big-${tx.id}-${tx.timeMs}`}
                                            className="flex items-center justify-between text-[10px] font-mono border-b border-main pb-1"
                                        >
                                            <span
                                                className={
                                                    tx.isBuy
                                                        ? "text-emerald-500"
                                                        : "text-rose-500"
                                                }
                                            >
                                                {tx.isBuy
                                                    ? t("transactionsPage.buy")
                                                    : t("transactionsPage.sell")}
                                            </span>
                                            <span className="text-main">
                                                {isStock ? "" : "$"}
                                                {compactUsdFmt.format(
                                                    tx.quoteQty,
                                                )}
                                            </span>
                                            <span className="text-muted">
                                                {tradePriceFmt(tx.price)}
                                            </span>
                                            <span className="text-muted">
                                                {tx.timeLabel}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}

function StatCard({
    label,
    value,
    accent,
    icon,
}: {
    label: string;
    value: string;
    accent?: string;
    icon?: ReactNode;
}) {
    return (
        <div className="rounded-lg border border-main bg-main px-3 py-2.5 space-y-1">
            <div className="text-[9px] text-muted uppercase tracking-widest font-bold flex items-center gap-1">
                {icon}
                <span>{label}</span>
            </div>
            <div
                className={cn(
                    "text-[13px] font-mono font-semibold tabular-nums",
                    accent ?? "text-main",
                )}
            >
                {value}
            </div>
        </div>
    );
}

function SizedChartContainer({
    className,
    children,
}: {
    className: string;
    children: (size: { width: number; height: number }) => ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const updateSize = () => {
            const rect = el.getBoundingClientRect();
            const width = Math.floor(rect.width);
            const height = Math.floor(rect.height);
            if (width <= 0 || height <= 0) return;
            setSize((prev) =>
                prev.width === width && prev.height === height
                    ? prev
                    : { width, height },
            );
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className={className}>
            {size.width > 0 && size.height > 0 ? children(size) : null}
        </div>
    );
}
