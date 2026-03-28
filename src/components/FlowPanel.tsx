"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    PieChart,
    Pie,
    ReferenceLine,
} from "recharts";
import { useMarket } from "../context/MarketContext";
import { useMarketFlow, PERIODS, FlowPeriod } from "../hooks/useMarketFlow";
import { cn } from "../lib/utils";
import { RefreshCw, Info, AlertCircle } from "lucide-react";

const PERIOD_LABELS: Record<FlowPeriod, string> = {
    "15m": "15ph",
    "30m": "30ph",
    "1h": "1h",
    "2h": "2h",
    "4h": "4h",
    "1d": "1ngày",
};

const numFmt = (n: number, decimals = 2) => {
    if (!Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000)
        return `${(n / 1_000_000_000).toFixed(decimals)}B`;
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`;
    return n.toFixed(decimals);
};

const pctFmt = (n: number) => `${(n * 100).toFixed(2)}%`;

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const raw = payload?.[0]?.payload ?? {};
    const title = raw?.time ?? raw?.name ?? label;

    const rows: Array<{ k: string; v: string; valueClass?: string }> = [];

    // Pie tooltip (donut)
    if (typeof raw?.value === "number" && typeof raw?.name === "string") {
        rows.push({ k: raw.name, v: numFmt(raw.value, 2) });
    }
    // Taker flow bar tooltip
    else if (
        typeof raw?.buyVol === "number" &&
        typeof raw?.sellVol === "number"
    ) {
        const net = raw?.net ?? raw.buyVol - raw.sellVol;
        rows.push({
            k: "Mua",
            v: numFmt(raw.buyVol, 2),
            valueClass: "text-emerald-500",
        });
        rows.push({
            k: "Bán",
            v: numFmt(raw.sellVol, 2),
            valueClass: "text-rose-500",
        });
        rows.push({
            k: "Net",
            v: numFmt(net, 2),
            valueClass: net >= 0 ? "text-emerald-500" : "text-rose-500",
        });
        if (typeof raw?.ratio === "number") {
            rows.push({ k: "Buy/Sell", v: raw.ratio.toFixed(4) });
        }
    }
    // Open interest area tooltip
    else if (typeof raw?.oi === "number" && typeof raw?.change === "number") {
        const change = raw.change;
        rows.push({ k: "OI", v: numFmt(raw.oi, 2) });
        rows.push({
            k: "Thay đổi",
            v: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
            valueClass: change >= 0 ? "text-emerald-500" : "text-rose-500",
        });
    }
    // Long/Short ratio area tooltip
    else if (
        typeof raw?.long === "number" &&
        typeof raw?.short === "number" &&
        typeof raw?.ratio === "number"
    ) {
        rows.push({
            k: "Long",
            v: pctFmt(raw.long),
            valueClass: "text-emerald-500",
        });
        rows.push({
            k: "Short",
            v: pctFmt(raw.short),
            valueClass: "text-rose-500",
        });
        rows.push({ k: "Long/Short", v: raw.ratio.toFixed(4) });
    } else {
        // Fallback: show first payload keys
        payload.slice(0, 6).forEach((p: any, i: number) => {
            const v =
                typeof p.value === "number"
                    ? numFmt(p.value, 4)
                    : String(p.value);
            rows.push({ k: p.name ?? `v${i}`, v, valueClass: p.color });
        });
    }

    return (
        <div className="bg-main border border-main rounded p-2 text-[10px] shadow-xl space-y-0.5 z-50">
            {title && (
                <p className="text-muted border-b border-main pb-1 mb-1">
                    {title}
                </p>
            )}
            {rows.map((r, i) => (
                <p key={i}>
                    <span className="text-muted">{r.k}: </span>
                    <span
                        className={cn(
                            "font-mono text-main",
                            r.valueClass ?? "",
                        )}
                    >
                        {r.v}
                    </span>
                </p>
            ))}
        </div>
    );
};

export const FlowPanel = () => {
    const { selectedSymbol } = useMarket();
    const [period, setPeriod] = useState<FlowPeriod>("1d");
    const { data, isLoading, isRefreshing, error, refetch } = useMarketFlow(
        selectedSymbol,
        period,
    );

    const baseSymbol = selectedSymbol.replace("USDT", "");

    const buckets = data?.buckets;
    const totalBuy = buckets
        ? buckets.large.buy + buckets.medium.buy + buckets.small.buy
        : 0;
    const totalSell = buckets
        ? buckets.large.sell + buckets.medium.sell + buckets.small.sell
        : 0;
    const totalNet = totalBuy - totalSell;

    const donutData = useMemo(
        () =>
            buckets
                ? [
              { name: "Mua Lớn", value: buckets.large.buy, fill: "#10b981" },
              { name: "Mua TB", value: buckets.medium.buy, fill: "#34d399" },
              { name: "Mua Nhỏ", value: buckets.small.buy, fill: "#6ee7b7" },
              { name: "Bán Nhỏ", value: buckets.small.sell, fill: "#fca5a5" },
              { name: "Bán TB", value: buckets.medium.sell, fill: "#fb7185" },
              { name: "Bán Lớn", value: buckets.large.sell, fill: "#f43f5e" },
                  ]
                : [],
        [buckets],
    );

    const lsChartData = (data?.longShortRatio ?? []).map((d) => ({
        time: new Date(d.timestamp).toLocaleDateString("vi-VN", {
            month: "2-digit",
            day: "2-digit",
        }),
        ratio: parseFloat(d.longShortRatio),
        long: parseFloat(d.longAccount),
        short: parseFloat(d.shortAccount),
    }));

    const takerChartData = (data?.takerFlow ?? []).map((d) => ({
        time: new Date(d.timestamp).toLocaleDateString("vi-VN", {
            month: "2-digit",
            day: "2-digit",
        }),
        buyVol: parseFloat(d.buyVol),
        sellVol: parseFloat(d.sellVol),
        net: parseFloat(d.buyVol) - parseFloat(d.sellVol),
        ratio: parseFloat(d.buySellRatio),
    }));

    const oiChartData = (data?.openInterest ?? []).map((d, i, arr) => {
        const prev = arr[i - 1];
        const curr = parseFloat(d.sumOpenInterest);
        const prevVal = prev ? parseFloat(prev.sumOpenInterest) : curr;
        return {
            time: new Date(d.timestamp).toLocaleDateString("vi-VN", {
                month: "2-digit",
                day: "2-digit",
            }),
            oi: curr,
            change: prev ? ((curr - prevVal) / prevVal) * 100 : 0,
        };
    });

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="flex flex-col items-center space-y-3 text-center max-w-xs">
                    <AlertCircle size={20} className="text-rose-500" />
                    <p className="text-[12px] text-rose-500 font-medium">
                        Lỗi tải dữ liệu
                    </p>
                    <p className="text-[10px] text-muted">{error}</p>
                    <button
                        onClick={refetch}
                        className="px-3 py-1.5 bg-accent/20 text-accent text-[10px] font-medium rounded hover:bg-accent/30 transition-colors"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto thin-scrollbar bg-main pb-12">
            {/* ── Filter Bar ── */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-main bg-secondary/10 sticky top-0 z-20 backdrop-blur-sm">
                <div className="flex items-center space-x-1">
                    {PERIODS.map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
                                period === p
                                    ? "bg-accent text-white"
                                    : "text-muted hover:text-main hover:bg-secondary",
                            )}
                        >
                            {PERIOD_LABELS[p]}
                        </button>
                    ))}
                </div>
                <button
                    onClick={refetch}
                    disabled={isLoading}
                    className={cn(
                        "p-1.5 rounded text-muted hover:text-main transition-colors",
                        isLoading && "animate-spin",
                    )}
                >
                    <RefreshCw size={12} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-main">
                {/* Row 1: Donut (L) + Table (R) */}
                <section className="bg-main p-4 border-b border-main lg:border-r">
                    <div className="flex items-center space-x-1.5 mb-3">
                        <span className="text-[11px] font-bold text-main uppercase tracking-wide">
                            Phân tích dòng tiền
                        </span>
                        <Info size={11} className="text-muted" />
                    </div>
                    <div className="flex items-center gap-4">
                        <SizedChartContainer className="w-40 h-40 shrink-0 min-w-[160px] min-h-[160px]">
                            {({ width, height }) => (
                                <PieChart width={width} height={height}>
                                    <Pie
                                        data={donutData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={28}
                                        outerRadius={54}
                                        stroke="none"
                                        dataKey="value"
                                    >
                                        {donutData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.fill}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            )}
                        </SizedChartContainer>
                        {buckets && (
                            <div className="flex-1 space-y-0.5 text-[9px]">
                                {donutData.map((d) => (
                                    <div
                                        key={d.name}
                                        className="flex items-center justify-between"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <div
                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                style={{ background: d.fill }}
                                            />
                                            <span className="text-muted">
                                                {d.name}
                                            </span>
                                        </div>
                                        <span className="font-mono text-main">
                                            {numFmt(d.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="bg-main p-4 border-b border-main">
                    <div className="flex items-center space-x-1.5 mb-2">
                        <span className="text-[11px] font-bold text-main uppercase tracking-wide">
                            Bảng số liệu ({baseSymbol})
                        </span>
                    </div>
                    {buckets && (
                        <div className="border border-main rounded overflow-hidden text-[10px]">
                            <table className="w-full text-right">
                                <thead className="bg-secondary/20 text-muted">
                                    <tr>
                                        <th className="py-1 px-2 text-left font-medium">
                                            Lệnh
                                        </th>
                                        <th className="py-1 px-2 font-medium">
                                            Mua
                                        </th>
                                        <th className="py-1 px-2 font-medium">
                                            Bán
                                        </th>
                                        <th className="py-1 px-2 font-medium">
                                            Dòng vào
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-main">
                                    {[
                                        {
                                            label: "Lớn",
                                            buy: buckets.large.buy,
                                            sell: buckets.large.sell,
                                        },
                                        {
                                            label: "TB",
                                            buy: buckets.medium.buy,
                                            sell: buckets.medium.sell,
                                        },
                                        {
                                            label: "Nhỏ",
                                            buy: buckets.small.buy,
                                            sell: buckets.small.sell,
                                        },
                                    ].map((row) => {
                                        const net = row.buy - row.sell;
                                        return (
                                            <tr
                                                key={row.label}
                                                className="hover:bg-secondary/10 border-b border-main    "
                                            >
                                                <td className="py-1 px-2 text-left text-muted">
                                                    {row.label}
                                                </td>
                                                <td className="py-1 px-2 text-emerald-500 font-mono">
                                                    {numFmt(row.buy, 2)}
                                                </td>
                                                <td className="py-1 px-2 text-rose-500 font-mono">
                                                    {numFmt(row.sell, 2)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        "py-1 px-2 font-mono",
                                                        net >= 0
                                                            ? "text-emerald-500"
                                                            : "text-rose-500",
                                                    )}
                                                >
                                                    {numFmt(net, 2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-secondary/5 font-bold">
                                        <td className="py-1 px-2 text-left">
                                            Tổng
                                        </td>
                                        <td className="py-1 px-2 text-emerald-500">
                                            {numFmt(totalBuy, 2)}
                                        </td>
                                        <td className="py-1 px-2 text-rose-500">
                                            {numFmt(totalSell, 2)}
                                        </td>
                                        <td
                                            className={cn(
                                                "py-1 px-2",
                                                totalNet >= 0
                                                    ? "text-emerald-500"
                                                    : "text-rose-500",
                                            )}
                                        >
                                            {numFmt(totalNet, 2)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Row 2: Taker Net (L) + OI Change (R) */}
                <section className="bg-main p-4 border-b border-main lg:border-r">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-main uppercase tracking-wide">
                            Dòng vào Taker ({baseSymbol})
                        </span>
                        <Info size={11} className="text-muted" />
                    </div>
                    <SizedChartContainer className="h-44 w-full min-w-[200px] min-h-[176px]">
                        {({ width, height }) => (
                            <BarChart
                                width={width}
                                height={height}
                                data={takerChartData}
                                margin={{
                                    top: 8,
                                    right: 8,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <XAxis dataKey="time" hide />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine
                                    y={0}
                                    stroke="var(--border-color)"
                                />
                                <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                                    {takerChartData.map((e, i) => (
                                        <Cell
                                            key={i}
                                            fill={
                                                e.net >= 0
                                                    ? "#10b981"
                                                    : "#f43f5e"
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        )}
                    </SizedChartContainer>
                </section>

                <section className="bg-main p-4 border-b border-main">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-main uppercase tracking-wide">
                            Thay đổi OI (Nợ ký quỹ)
                        </span>
                        <Info size={11} className="text-muted" />
                    </div>
                    <SizedChartContainer className="h-44 w-full min-w-[200px] min-h-[176px]">
                        {({ width, height }) => (
                            <AreaChart
                                width={width}
                                height={height}
                                data={oiChartData}
                                margin={{
                                    top: 8,
                                    right: 8,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <XAxis dataKey="time" hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="change"
                                    stroke="#eab308"
                                    strokeWidth={2}
                                    fill="#eab308"
                                    fillOpacity={0.15}
                                />
                            </AreaChart>
                        )}
                    </SizedChartContainer>
                </section>

                {/* Row 3: L/S Ratio (Spans 2 columns if on large screen) */}
                <section className="bg-main p-4 border-b border-main lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-main uppercase tracking-wide">
                            Tỷ lệ vị thế Long/Short
                        </span>
                        {lsChartData.length > 0 &&
                            (() => {
                                const latest =
                                    lsChartData[lsChartData.length - 1];
                                return (
                                    <div className="flex items-center space-x-3 text-[10px]">
                                        <span className="font-mono text-emerald-500">
                                            L: {pctFmt(latest.long)}
                                        </span>
                                        <span className="font-mono text-rose-500">
                                            S: {pctFmt(latest.short)}
                                        </span>
                                    </div>
                                );
                            })()}
                    </div>
                    <SizedChartContainer className="h-44 w-full min-w-[300px] min-h-[176px]">
                        {({ width, height }) => (
                            <AreaChart
                                width={width}
                                height={height}
                                data={lsChartData}
                                margin={{
                                    top: 8,
                                    right: 40,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <XAxis dataKey="time" hide />
                                <YAxis
                                    width={35}
                                    tick={{ fontSize: 9 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="ratio"
                                    stroke="#eab308"
                                    strokeWidth={2}
                                    fill="#eab308"
                                    fillOpacity={0.15}
                                />
                            </AreaChart>
                        )}
                    </SizedChartContainer>
                </section>

                {isLoading && !data && (
                    <div className="p-8 flex items-center justify-center flex-col space-y-2 lg:col-span-2">
                        <RefreshCw
                            size={18}
                            className="animate-spin text-muted"
                        />
                        <span className="text-[11px] text-muted">
                            Đang truy xuất dữ liệu từ Binance...
                        </span>
                    </div>
                )}
            </div>
            {isRefreshing && (
                <div className="sticky bottom-2 flex justify-center pointer-events-none">
                    <div className="px-2 py-1 rounded-md border border-main bg-main/90 text-[10px] text-muted inline-flex items-center gap-1.5">
                        <RefreshCw size={10} className="animate-spin" />
                        Đang cập nhật dữ liệu...
                    </div>
                </div>
            )}
        </div>
    );
};

const SizedChartContainer = ({
    className,
    children,
}: {
    className: string;
    children: (size: { width: number; height: number }) => React.ReactNode;
}) => {
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

    const hasSize = size.width > 0 && size.height > 0;
    return (
        <div ref={ref} className={className}>
            {hasSize ? children(size) : null}
        </div>
    );
};
