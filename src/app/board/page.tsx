"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import {
    Search,
    Settings,
    LayoutGrid,
    ChevronDown,
    ArrowUp,
    Pin,
    Sun,
    Moon,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { AppTopBar } from "../../components/shell/AppTopBar";
import { TickerBar } from "../../components/TickerBar";
import { cn } from "../../lib/utils";
import { useUniverse } from "../../context/UniverseContext";
import { useAppSettings } from "../../context/AppSettingsContext";

type StockData = {
    ticker: string;
    ceiling: number;
    floor: number;
    ref: number;
    buy: { price: number; vol: string }[];
    match: { price: number; vol: string; change: number; percent: number };
    sell: { price: number; vol: string }[];
    totalVol: string;
    high: number;
    low: number;
    foreign: { buy: string; sell: string; room: string };
    isPinned?: boolean;
};

type IndexData = {
    name: string;
    value: number;
    change: number;
    vol: string;
    valueT: string;
    up: number;
    ref: number;
    down: number;
};

const INDICES: IndexData[] = [
    {
        name: "VNINDEX",
        value: 1706.19,
        change: 31.7,
        vol: "824.983",
        valueT: "25,270.502",
        up: 195,
        ref: 61,
        down: 119,
    },
    {
        name: "VN30",
        value: 1864.14,
        change: 34.55,
        vol: "351.081",
        valueT: "14,556.365",
        up: 29,
        ref: 0,
        down: 1,
    },
    {
        name: "HNX30",
        value: 544.86,
        change: 1.43,
        vol: "64.722",
        valueT: "1,503.526",
        up: 13,
        ref: 7,
        down: 10,
    },
    {
        name: "VNXALL",
        value: 2801.43,
        change: 41.58,
        vol: "866.132",
        valueT: "25,432.520",
        up: 228,
        ref: 103,
        down: 152,
    },
    {
        name: "HNXINDEX",
        value: 251.82,
        change: 0.84,
        vol: "84.413",
        valueT: "1,712.877",
        up: 78,
        ref: 66,
        down: 78,
    },
    {
        name: "UPCOM",
        value: 127.42,
        change: 1,
        vol: "26.442",
        valueT: "427.871",
        up: 122,
        ref: 93,
        down: 110,
    },
];

const STOCKS: StockData[] = [
    {
        ticker: "ACB",
        ceiling: 25.15,
        floor: 21.95,
        ref: 23.55,
        buy: [
            { price: 23.6, vol: "123,600" },
            { price: 23.65, vol: "172,000" },
            { price: 23.7, vol: "44,900" },
        ],
        match: { price: 23.7, vol: "2,200", change: 0.15, percent: 0.64 },
        sell: [
            { price: 23.75, vol: "57,400" },
            { price: 23.8, vol: "270,300" },
            { price: 23.85, vol: "271,800" },
        ],
        totalVol: "8,422,600",
        high: 23.9,
        low: 23.7,
        foreign: {
            buy: "1,869,600",
            sell: "2,330,500",
            room: "127,794,367",
        },
        isPinned: true,
    },
    {
        ticker: "BID",
        ceiling: 42.15,
        floor: 36.65,
        ref: 39.4,
        buy: [
            { price: 40.1, vol: "53,900" },
            { price: 40.15, vol: "44,100" },
            { price: 40.2, vol: "29,400" },
        ],
        match: { price: 40.2, vol: "1,000", change: 0.8, percent: 2.03 },
        sell: [
            { price: 40.25, vol: "8,700" },
            { price: 40.3, vol: "29,100" },
            { price: 40.35, vol: "18,600" },
        ],
        totalVol: "9,588,900",
        high: 40.6,
        low: 39.7,
        foreign: {
            buy: "268,600",
            sell: "1,143,404",
            room: "920,823,439",
        },
        isPinned: true,
    },
    {
        ticker: "CTG",
        ceiling: 37,
        floor: 32.2,
        ref: 34.6,
        buy: [
            { price: 34.7, vol: "77,700" },
            { price: 34.75, vol: "105,000" },
            { price: 34.8, vol: "139,400" },
        ],
        match: { price: 34.8, vol: "200", change: 0.2, percent: 0.58 },
        sell: [
            { price: 34.85, vol: "80,800" },
            { price: 34.9, vol: "365,600" },
            { price: 34.95, vol: "151,600" },
        ],
        totalVol: "7,331,300",
        high: 35.3,
        low: 34.65,
        foreign: {
            buy: "694,600",
            sell: "1,789,505",
            room: "360,747,347",
        },
        isPinned: true,
    },
    {
        ticker: "FPT",
        ceiling: 79.9,
        floor: 69.5,
        ref: 74.7,
        buy: [
            { price: 75, vol: "308,100" },
            { price: 75.1, vol: "140,600" },
            { price: 75.2, vol: "75,400" },
        ],
        match: { price: 75.3, vol: "300", change: 0.6, percent: 0.8 },
        sell: [
            { price: 75.3, vol: "18,000" },
            { price: 75.4, vol: "103,600" },
            { price: 75.5, vol: "214,400" },
        ],
        totalVol: "6,684,000",
        high: 76.3,
        low: 75,
        foreign: {
            buy: "1,383,620",
            sell: "3,169,721",
            room: "268,754,938",
        },
        isPinned: true,
    },
    {
        ticker: "HPG",
        ceiling: 28.75,
        floor: 25.05,
        ref: 26.9,
        buy: [
            { price: 27, vol: "668,000" },
            { price: 27.05, vol: "487,700" },
            { price: 27.1, vol: "749,400" },
        ],
        match: { price: 27.15, vol: "100", change: 0.25, percent: 0.93 },
        sell: [
            { price: 27.15, vol: "100" },
            { price: 27.2, vol: "646,700" },
            { price: 27.25, vol: "628,100" },
        ],
        totalVol: "28,780,200",
        high: 27.45,
        low: 27.1,
        foreign: {
            buy: "7,456,600",
            sell: "1,113,331",
            room: "2,062,334,958",
        },
        isPinned: true,
    },
    {
        ticker: "MBB",
        ceiling: 28.3,
        floor: 24.6,
        ref: 26.45,
        buy: [
            { price: 26.45, vol: "2,006,200" },
            { price: 26.5, vol: "1,521,800" },
            { price: 26.55, vol: "60,200" },
        ],
        match: { price: 26.55, vol: "200", change: 0.1, percent: 0.38 },
        sell: [
            { price: 26.6, vol: "519,400" },
            { price: 26.65, vol: "308,600" },
            { price: 26.7, vol: "456,700" },
        ],
        totalVol: "16,575,900",
        high: 27.1,
        low: 26.5,
        foreign: { buy: "1,281,100", sell: "3,927,080", room: "" },
        isPinned: true,
    },
];

function generateChartData(points: number, base: number) {
    return Array.from({ length: points }, (_, i) => ({
        time: `${9 + Math.floor(i / 12)}h${String((i % 12) * 5).padStart(2, "0")}`,
        value: base + Math.sin(i / 6) * 8 + Math.cos(i / 3) * 2,
    }));
}

function ColorText({
    value,
    refVal,
    ceiling,
    floor,
    children,
    className,
}: {
    value: number;
    refVal: number;
    ceiling: number;
    floor: number;
    children: React.ReactNode;
    className?: string;
}) {
    let color = "text-amber-500";
    if (value === ceiling) color = "text-fuchsia-500";
    else if (value === floor) color = "text-cyan-500";
    else if (value > refVal) color = "text-emerald-500";
    else if (value < refVal) color = "text-rose-500";

    return <span className={cn(color, className)}>{children}</span>;
}

function MiniChart({
    data,
    color,
    title,
    stats,
}: {
    data: { time: string; value: number }[];
    color: string;
    title: string;
    stats: IndexData;
}) {
    const isPositive = stats.change >= 0;
    const percent = (
        (stats.change / (stats.value - stats.change)) *
        100
    ).toFixed(2);

    return (
        <div className="flex-1 min-w-[280px] border border-main bg-secondary rounded-sm p-2">
            <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-main">
                        {title}
                        <ChevronDown size={12} className="text-muted" />
                    </div>
                    <div
                        className={cn(
                            "text-[18px] font-bold leading-tight",
                            isPositive ? "text-emerald-500" : "text-rose-500",
                        )}
                    >
                        {stats.value.toLocaleString()} (
                        {isPositive ? `+${stats.change}` : stats.change}{" "}
                        {percent}%)
                    </div>
                    <div className="text-[10px] text-muted">
                        {stats.vol} CP <span className="mx-1">|</span>{" "}
                        {stats.valueT} Tỷ
                    </div>
                </div>
                <div className="text-[10px]">
                    <div className="flex gap-2">
                        <span className="text-emerald-500">▲ {stats.up}</span>
                        <span className="text-amber-500">■ {stats.ref}</span>
                        <span className="text-rose-500">▼ {stats.down}</span>
                    </div>
                    <div className="mt-1 text-right text-muted">Liên tục</div>
                </div>
            </div>
            <div className="h-24 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient
                                id={`grad-${title}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor={color}
                                    stopOpacity={0.3}
                                />
                                <stop
                                    offset="95%"
                                    stopColor={color}
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="var(--border-color)"
                        />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "var(--bg-secondary)",
                                border: "1px solid var(--border-color)",
                                fontSize: "10px",
                                color: "var(--text-main)",
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            fillOpacity={1}
                            fill={`url(#grad-${title})`}
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default function BoardPage() {
    const { universe } = useUniverse();
    const { toggleTheme, theme } = useAppSettings();
    const [activeTab, setActiveTab] = useState("VN30");

    const chartData = useMemo(
        () => ({
            VNINDEX: generateChartData(50, 1680),
            VN30: generateChartData(50, 1830),
            HNX30: generateChartData(50, 540),
            HNXINDEX: generateChartData(50, 250),
        }),
        [],
    );

    const isLight = theme === "light";

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-main text-main">
            <AppTopBar
                refreshTitle="Refresh board"
                refreshAriaLabel="Refresh board"
                navItems={[
                    { href: "/", label: "Chart" },
                    { href: "/market", label: "Markets" },
                    { href: "/board", label: "Board" },
                    { href: "/heatmap", label: "Heatmap" },
                    { href: "/news", label: "News" },
                ]}
            />

            {universe !== "stock" ? (
                <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-10 sm:py-14">
                    <div className="w-full max-w-[420px] space-y-6 px-8 py-10 text-center sm:px-10 sm:py-12">
                        <div className="flex justify-center">
                            <Image
                                src="/loading.gif"
                                alt="Loading"
                                width={100}
                                height={100}
                                className="rounded-sm"
                                unoptimized
                                priority
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                                Coming soon
                            </p>
                            <h2 className="text-[15px] font-semibold tracking-tight text-main">
                                Board
                            </h2>
                            <p className="text-[12px] leading-relaxed text-muted">
                                This section is under development. Check back
                                later for updates.
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-accent/90"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex gap-2 overflow-x-auto border-b border-main bg-main px-2 py-2 thin-scrollbar">
                        <MiniChart
                            data={chartData.VNINDEX}
                            color="#10b981"
                            title="VNINDEX"
                            stats={INDICES[0]}
                        />
                        <MiniChart
                            data={chartData.VN30}
                            color="#10b981"
                            title="VN30"
                            stats={INDICES[1]}
                        />
                        <MiniChart
                            data={chartData.HNX30}
                            color="#10b981"
                            title="HNX30"
                            stats={INDICES[2]}
                        />
                        <MiniChart
                            data={chartData.HNXINDEX}
                            color="#10b981"
                            title="HNXINDEX"
                            stats={INDICES[4]}
                        />

                        <div className="w-[360px] shrink-0 rounded-sm border border-main bg-secondary p-2">
                            <table className="w-full text-[10px]">
                                <thead>
                                    <tr className="border-b border-main text-muted">
                                        <th className="p-1 text-left font-medium">
                                            Chỉ số
                                        </th>
                                        <th className="p-1 text-right font-medium">
                                            Điểm
                                        </th>
                                        <th className="p-1 text-right font-medium">
                                            +/-
                                        </th>
                                        <th className="p-1 text-right font-medium">
                                            KLGD
                                        </th>
                                        <th className="p-1 text-right font-medium">
                                            GTGD
                                        </th>
                                        <th className="p-1 text-right font-medium">
                                            T/G
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {INDICES.map((idx) => (
                                        <tr
                                            key={idx.name}
                                            className="border-b border-main hover:bg-main/20"
                                        >
                                            <td className="p-1 font-semibold">
                                                {idx.name}
                                            </td>
                                            <td
                                                className={cn(
                                                    "p-1 text-right font-bold",
                                                    idx.change >= 0
                                                        ? "text-emerald-500"
                                                        : "text-rose-500",
                                                )}
                                            >
                                                {idx.value.toLocaleString()}
                                            </td>
                                            <td
                                                className={cn(
                                                    "p-1 text-right",
                                                    idx.change >= 0
                                                        ? "text-emerald-500"
                                                        : "text-rose-500",
                                                )}
                                            >
                                                {idx.change >= 0
                                                    ? `+${idx.change}`
                                                    : idx.change}
                                            </td>
                                            <td className="p-1 text-right">
                                                {idx.vol}
                                            </td>
                                            <td className="p-1 text-right">
                                                {idx.valueT}
                                            </td>
                                            <td className="p-1 text-right">
                                                <span className="text-emerald-500">
                                                    {idx.up}
                                                </span>
                                                <span className="px-1 text-amber-500">
                                                    {idx.ref}
                                                </span>
                                                <span className="text-rose-500">
                                                    {idx.down}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="sticky top-0 z-20 flex h-11 items-center gap-3 border-b border-main bg-secondary px-2">
                        <div className="relative w-full max-w-xs">
                            <Search
                                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted"
                                size={14}
                            />
                            <input
                                type="text"
                                placeholder="Tìm kiếm mã CK"
                                className="w-full rounded-md border border-main bg-main px-8 py-1.5 text-xs focus:border-accent focus:outline-none"
                            />
                        </div>

                        <div className="flex h-full items-center gap-1 overflow-x-auto thin-scrollbar">
                            {[
                                "Danh mục của tôi",
                                "VN30",
                                "HNX30",
                                "HOSE",
                                "HNX",
                                "UPCOM",
                                "CP Ngành",
                                "ETF",
                            ].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "h-full whitespace-nowrap border-b-2 px-3 text-[11px] font-semibold transition-colors",
                                        activeTab === tab
                                            ? "border-emerald-500 text-emerald-500"
                                            : "border-transparent text-muted hover:text-main",
                                    )}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {tab}
                                        {[
                                            "VN30",
                                            "HNX30",
                                            "HOSE",
                                            "HNX",
                                            "UPCOM",
                                            "CP Ngành",
                                            "ETF",
                                        ].includes(tab) && (
                                            <ChevronDown size={11} />
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className="rounded-md p-1.5 text-muted hover:bg-main hover:text-main"
                                title="Toggle theme"
                            >
                                {isLight ? (
                                    <Moon size={14} />
                                ) : (
                                    <Sun size={14} />
                                )}
                            </button>
                            <button className="rounded-md p-1.5 text-muted hover:bg-main hover:text-main">
                                <ArrowUp size={14} />
                            </button>
                            <button className="rounded-md p-1.5 text-muted hover:bg-main hover:text-main">
                                <LayoutGrid size={14} />
                            </button>
                            <button className="rounded-md p-1.5 text-muted hover:bg-main hover:text-main">
                                <Settings size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto pb-8 thin-scrollbar">
                        <table className="w-full min-w-[1500px] table-fixed border-collapse text-[11px]">
                            <colgroup>
                                <col style={{ width: 90 }} />
                                <col style={{ width: 64 }} />
                                <col style={{ width: 64 }} />
                                <col style={{ width: 64 }} />

                                <col style={{ width: 64 }} />
                                <col style={{ width: 84 }} />
                                <col style={{ width: 64 }} />
                                <col style={{ width: 84 }} />
                                <col style={{ width: 64 }} />
                                <col style={{ width: 84 }} />

                                <col style={{ width: 64 }} />
                                <col style={{ width: 84 }} />
                                <col style={{ width: 64 }} />
                                <col style={{ width: 72 }} />

                                <col style={{ width: 64 }} />
                                <col style={{ width: 84 }} />
                                <col style={{ width: 64 }} />
                                <col style={{ width: 84 }} />
                                <col style={{ width: 64 }} />
                                <col style={{ width: 84 }} />

                                <col style={{ width: 112 }} />
                                <col style={{ width: 64 }} />
                                <col style={{ width: 64 }} />

                                <col style={{ width: 110 }} />
                                <col style={{ width: 110 }} />
                                <col style={{ width: 130 }} />
                            </colgroup>
                            <thead className="sticky top-0 z-10 bg-secondary">
                                <tr className="border-b border-main text-muted">
                                    <th
                                        rowSpan={2}
                                        className="min-w-[90px] border-r border-main p-2"
                                    >
                                        CK
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="border-r border-main p-2 text-fuchsia-500"
                                    >
                                        Trần
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="border-r border-main p-2 text-cyan-500"
                                    >
                                        Sàn
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="border-r border-main p-2 text-amber-500"
                                    >
                                        TC
                                    </th>
                                    <th
                                        colSpan={6}
                                        className="border-r border-main border-b border-main p-1 text-center"
                                    >
                                        Bên mua
                                    </th>
                                    <th
                                        colSpan={4}
                                        className="border-r border-main border-b border-main p-1 text-center"
                                    >
                                        Khớp lệnh
                                    </th>
                                    <th
                                        colSpan={6}
                                        className="border-r border-main border-b border-main p-1 text-center"
                                    >
                                        Bên bán
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="border-r border-main p-2"
                                    >
                                        Tổng KL
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="border-r border-main p-2"
                                    >
                                        Cao
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="border-r border-main p-2"
                                    >
                                        Thấp
                                    </th>
                                    <th
                                        colSpan={3}
                                        className="border-b border-main p-1 text-center"
                                    >
                                        ĐTNN
                                    </th>
                                </tr>
                                <tr className="border-b border-main text-[10px] text-muted">
                                    <th className="border-r border-main p-1">
                                        Giá 3
                                    </th>
                                    <th className="border-r border-main p-1">
                                        KL 3
                                    </th>
                                    <th className="border-r border-main p-1">
                                        Giá 2
                                    </th>
                                    <th className="border-r border-main p-1">
                                        KL 2
                                    </th>
                                    <th className="border-r border-main p-1">
                                        Giá 1
                                    </th>
                                    <th className="border-r border-main p-1">
                                        KL 1
                                    </th>

                                    <th className="border-r border-main p-1">
                                        Giá
                                    </th>
                                    <th className="border-r border-main p-1">
                                        KL
                                    </th>
                                    <th className="border-r border-main p-1">
                                        +/-
                                    </th>
                                    <th className="border-r border-main p-1">
                                        +/- (%)
                                    </th>

                                    <th className="border-r border-main p-1">
                                        Giá 1
                                    </th>
                                    <th className="border-r border-main p-1">
                                        KL 1
                                    </th>
                                    <th className="border-r border-main p-1">
                                        Giá 2
                                    </th>
                                    <th className="border-r border-main p-1">
                                        KL 2
                                    </th>
                                    <th className="border-r border-main p-1">
                                        Giá 3
                                    </th>
                                    <th className="border-r border-main p-1">
                                        KL 3
                                    </th>

                                    <th className="border-r border-main p-1">
                                        NN mua
                                    </th>
                                    <th className="border-r border-main p-1">
                                        NN bán
                                    </th>
                                    <th className="p-1">Room</th>
                                </tr>
                            </thead>
                            <tbody className="bg-main">
                                {STOCKS.map((stock) => (
                                    <tr
                                        key={stock.ticker}
                                        className="border-b border-main hover:bg-secondary/50"
                                    >
                                        <td className="border-r border-main p-2 font-semibold">
                                            <span className="inline-flex items-center gap-1">
                                                <Pin
                                                    size={10}
                                                    className={cn(
                                                        stock.isPinned
                                                            ? "fill-emerald-500 text-emerald-500"
                                                            : "text-muted",
                                                    )}
                                                />
                                                {stock.ticker}
                                            </span>
                                        </td>
                                        <td className="border-r border-main p-2 text-right text-fuchsia-500">
                                            {stock.ceiling.toFixed(2)}
                                        </td>
                                        <td className="border-r border-main p-2 text-right text-cyan-500">
                                            {stock.floor.toFixed(2)}
                                        </td>
                                        <td className="border-r border-main p-2 text-right text-amber-500">
                                            {stock.ref.toFixed(2)}
                                        </td>

                                        {stock.buy.map((b, i) => (
                                            <React.Fragment
                                                key={`${stock.ticker}-buy-${i}`}
                                            >
                                                <td className="border-r border-main p-1 text-right">
                                                    <ColorText
                                                        value={b.price}
                                                        refVal={stock.ref}
                                                        ceiling={stock.ceiling}
                                                        floor={stock.floor}
                                                    >
                                                        {b.price.toFixed(2)}
                                                    </ColorText>
                                                </td>
                                                <td className="border-r border-main p-1 text-right font-semibold text-emerald-500">
                                                    {b.vol}
                                                </td>
                                            </React.Fragment>
                                        ))}

                                        <td className="border-r border-main p-1 text-right">
                                            <ColorText
                                                value={stock.match.price}
                                                refVal={stock.ref}
                                                ceiling={stock.ceiling}
                                                floor={stock.floor}
                                                className="font-semibold"
                                            >
                                                {stock.match.price.toFixed(2)}
                                            </ColorText>
                                        </td>
                                        <td className="border-r border-main p-1 text-right font-semibold text-emerald-500">
                                            {stock.match.vol}
                                        </td>
                                        <td
                                            className={cn(
                                                "border-r border-main p-1 text-right",
                                                stock.match.change >= 0
                                                    ? "text-emerald-500"
                                                    : "text-rose-500",
                                            )}
                                        >
                                            {stock.match.change.toFixed(2)}
                                        </td>
                                        <td
                                            className={cn(
                                                "border-r border-main p-1 text-right",
                                                stock.match.percent >= 0
                                                    ? "text-emerald-500"
                                                    : "text-rose-500",
                                            )}
                                        >
                                            {stock.match.percent.toFixed(2)}%
                                        </td>

                                        {stock.sell.map((s, i) => (
                                            <React.Fragment
                                                key={`${stock.ticker}-sell-${i}`}
                                            >
                                                <td className="border-r border-main p-1 text-right">
                                                    <ColorText
                                                        value={s.price}
                                                        refVal={stock.ref}
                                                        ceiling={stock.ceiling}
                                                        floor={stock.floor}
                                                    >
                                                        {s.price.toFixed(2)}
                                                    </ColorText>
                                                </td>
                                                <td className="border-r border-main p-1 text-right font-semibold text-rose-500">
                                                    {s.vol}
                                                </td>
                                            </React.Fragment>
                                        ))}

                                        <td className="border-r border-main p-2 text-right">
                                            {stock.totalVol}
                                        </td>
                                        <td className="border-r border-main p-2 text-right text-emerald-500">
                                            {stock.high.toFixed(2)}
                                        </td>
                                        <td className="border-r border-main p-2 text-right text-amber-500">
                                            {stock.low.toFixed(2)}
                                        </td>

                                        <td className="border-r border-main p-1 text-right">
                                            {stock.foreign.buy}
                                        </td>
                                        <td className="border-r border-main p-1 text-right">
                                            {stock.foreign.sell}
                                        </td>
                                        <td className="p-1 text-right">
                                            {stock.foreign.room || "--"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <TickerBar />
                </>
            )}
        </div>
    );
}
