"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Search,
    Star,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Filter,
    RefreshCw,
    Moon,
    Sun,
    Palette,
} from "lucide-react";
import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts";
import { useAppSettings, AppTheme } from "../../context/AppSettingsContext";
import { useMarket } from "../../context/MarketContext";
import { useMarketPageData } from "../../hooks/useMarketPageData";
import { useRouter } from "next/navigation";
import { WatchlistDropdown } from "../../components/AssetList";
import { UserMenu } from "../../components/UserMenu";
import { cn } from "../../lib/utils";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const statCardSparks = [
    [
        { v: 10 },
        { v: 12 },
        { v: 11 },
        { v: 15 },
        { v: 14 },
        { v: 18 },
        { v: 20 },
        { v: 22 },
    ],
    [
        { v: 18 },
        { v: 20 },
        { v: 22 },
        { v: 19 },
        { v: 24 },
        { v: 23 },
        { v: 26 },
        { v: 28 },
    ],
    [
        { v: 30 },
        { v: 26 },
        { v: 28 },
        { v: 24 },
        { v: 22 },
        { v: 20 },
        { v: 18 },
        { v: 14 },
    ],
];

type Trend = "up" | "down" | "flat";
type Sentiment = "Positive" | "Negative" | "Neutral";

const SUB_TABS = ["Top", "Trending", "New", "Most Visited", "Gainers", "More"];
const FILTER_CHIPS = [
    "All Network",
    "Highlights",
    "BSC",
    "Base",
    "Solana",
    "Ethereum",
    "More",
];
const MARKET_TABS = ["Spot", "Futures"];

// ─── Sub-components ───────────────────────────────────────────────────────────

const THEME_META: Record<AppTheme, { icon: React.ReactNode; label: string }> = {
    light: { icon: <Sun size={14} />, label: "Light" },
    dark1: { icon: <Moon size={14} />, label: "Dark I" },
    dark2: { icon: <Moon size={14} />, label: "Dark II" },
    dark3: { icon: <Palette size={14} />, label: "Dark III" },
    dark4: { icon: <Palette size={14} />, label: "Dark IV" },
    dark5: { icon: <Moon size={14} />, label: "Dark V" },
};

function MiniSparkline({
    data,
    positive,
}: {
    data: { v: number }[];
    positive: boolean;
}) {
    if (!data || data.length < 2) {
        return (
            <div className="h-10 w-28 flex items-center justify-center text-[11px] text-muted">
                --
            </div>
        );
    }
    return (
        <div className="h-10 w-28">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <Line
                        type="monotone"
                        dataKey="v"
                        stroke={
                            positive
                                ? "var(--color-up, #22c55e)"
                                : "var(--color-down, #ef4444)"
                        }
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function StatCard({
    title,
    value,
    change,
    positive,
    sparkData,
}: {
    title: string;
    value: string;
    change: string;
    positive: boolean;
    sparkData: { v: number }[];
}) {
    return (
        <div className="bg-secondary border border-main rounded-xl px-4 py-4 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-1 text-muted text-[11px] mb-1.5">
                        {title}
                        <ChevronDown size={11} className="opacity-60" />
                    </div>
                    <div className="text-[20px] font-bold tracking-tight">
                        {value}
                    </div>
                    <div
                        className={cn(
                            "text-[11px] font-semibold mt-0.5",
                            positive ? "text-emerald-500" : "text-rose-500",
                        )}
                    >
                        {positive ? "▲" : "▼"} {change}
                    </div>
                </div>
                <MiniSparkline data={sparkData} positive={positive} />
            </div>
        </div>
    );
}

function AltcoinSeasonCard() {
    return (
        <div className="bg-secondary border border-main rounded-xl px-4 py-4 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-muted text-[11px] mb-2">
                Altcoin Season
                <ChevronDown size={11} className="opacity-60" />
            </div>
            <div className="text-[20px] font-bold tracking-tight">
                37
                <span className="text-[13px] text-muted font-normal">/150</span>
            </div>
            <div className="mt-2">
                <div className="w-full h-1 bg-main rounded-full overflow-hidden">
                    <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: "37%" }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-muted mt-1">
                    <span>Bitcoin</span>
                    <span>Altcoin</span>
                </div>
            </div>
        </div>
    );
}

function AvgRsiCard() {
    return (
        <div className="bg-secondary border border-main rounded-xl px-4 py-4 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-muted text-[11px] mb-2">
                Average Crypto RSI
                <ChevronDown size={11} className="opacity-60" />
            </div>
            <div className="text-[20px] font-bold tracking-tight">74.53</div>
            <div className="mt-2">
                <div className="w-full h-1 bg-main rounded-full relative">
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full border-2 border-secondary"
                        style={{ left: "74%" }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-muted mt-2">
                    <span>Oversold</span>
                    <span>Overbought</span>
                </div>
            </div>
        </div>
    );
}

function FearGreedCard() {
    const val = 75;
    const circumference = 2 * Math.PI * 36;
    const filled = (val / 100) * circumference * 0.5;
    return (
        <div className="bg-secondary border border-main rounded-xl px-4 py-4 flex flex-col items-center justify-center">
            <div className="relative w-20 h-10 overflow-hidden">
                <svg
                    width="80"
                    height="52"
                    viewBox="0 0 80 52"
                    className="absolute top-0 left-0"
                >
                    <path
                        d="M 4 44 A 36 36 0 0 1 76 44"
                        fill="none"
                        stroke="var(--border-color)"
                        strokeWidth="7"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 4 44 A 36 36 0 0 1 76 44"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`${filled} ${circumference}`}
                    />
                </svg>
            </div>
            <div className="text-[22px] font-bold tracking-tight mt-1">
                {val}
            </div>
            <div className="text-[10px] text-muted uppercase tracking-widest">
                Fear &amp; Greed
            </div>
        </div>
    );
}

function SentimentBadge({ v }: { v: Sentiment }) {
    return (
        <span
            className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                v === "Positive"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : v === "Neutral"
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "bg-rose-500/10 text-rose-500",
            )}
        >
            {v}
        </span>
    );
}

function PctCell({ v }: { v: number | null }) {
    if (v === null || Number.isNaN(v)) {
        return (
            <td className="px-4 py-4 text-[13px] font-medium text-right text-muted">
                --
            </td>
        );
    }
    const pos = v >= 0;
    return (
        <td
            className={cn(
                "px-4 py-4 text-[13px] font-medium text-right",
                pos ? "text-emerald-500" : "text-rose-500",
            )}
        >
            {pos ? "▲" : "▼"} {Math.abs(v).toFixed(2)}%
        </td>
    );
}

function priceFmt(v: number): string {
    if (v === 0) return "0.00";
    if (v < 0.0001) return v.toExponential(2);
    if (v < 0.01) return v.toFixed(6);
    if (v < 1) return v.toFixed(4);
    if (v < 100) return v.toFixed(2);
    if (v < 10_000)
        return v.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function CoinAvatar({ symbol, logoUrl }: { symbol: string; logoUrl?: string }) {
    const colors: Record<string, string> = {
        BTC: "#F7931A",
        ETH: "#627EEA",
        BNB: "#F3BA2F",
        SOL: "#9945FF",
        XMR: "#FF6600",
        USDC: "#2775CA",
        PEPE: "#5EDA6C",
        XRP: "#0085C0",
        ADA: "#0033AD",
        DOGE: "#C3A634",
    };
    const bg = colors[symbol] ?? "#6B7280";
    return (
        <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden"
            style={{
                backgroundColor: bg + "33",
                border: `1.5px solid ${bg}55`,
            }}
        >
            {logoUrl ? (
                <img
                    src={logoUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                />
            ) : (
                <span style={{ color: bg }}>{symbol[0]}</span>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MarketPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useAppSettings();
    const { marketType, setMarketType, setSelectedSymbol } = useMarket();
    const { rows, stats, isLoading, refetch } = useMarketPageData();

    const handleRowClick = (symbol: string) => {
        setSelectedSymbol(symbol);
        router.push("/");
    };
    const [activeSubTab, setActiveSubTab] = useState("Top");
    const [activeFilter, setActiveFilter] = useState("All Network");
    const [activeMarket, setActiveMarket] = useState(
        marketType === "futures" ? "Futures" : "Spot",
    );
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const meta = THEME_META[theme];

    useEffect(() => {
        setActiveMarket(marketType === "futures" ? "Futures" : "Spot");
    }, [marketType]);

    useEffect(() => {
        setPage(1);
    }, [search, activeMarket]);

    const filteredData = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return rows;
        return rows.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.symbol.toLowerCase().includes(q),
        );
    }, [search, rows]);

    const statCards = useMemo(
        () => [
            {
                title: "Market Cap",
                value: stats.marketCap,
                change: "+0.47%",
                positive: true,
            },
            {
                title: "24h Volume",
                value: stats.volume24h,
                change: "+0.00%",
                positive: true,
            },
            {
                title: "BTC Dominance",
                value: stats.btcDominance,
                change: "0.00%",
                positive: true,
            },
        ],
        [stats],
    );

    const pagedData = useMemo(() => {
        const pageSize = 20;
        const start = (page - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, page]);
    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(filteredData.length / 20)),
        [filteredData.length],
    );

    function handleRefresh() {
        setIsRefreshing(true);
        refetch();
        setTimeout(() => setIsRefreshing(false), 800);
    }

    return (
        <div className="min-h-screen bg-main text-main flex flex-col">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="h-12 border-b border-main flex items-center justify-between px-6 bg-main z-50 shrink-0 sticky top-0">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2.5">
                        <Image
                            src="/logo.gif"
                            alt="FinTrace"
                            width={32}
                            height={32}
                            unoptimized
                            className=" "
                        />
                        <span className="font-bold text-[14px] tracking-tight">
                            FinTrace
                        </span>
                    </Link>

                    <nav className="flex items-center gap-1">
                        <div className="flex items-center rounded-md border border-main overflow-hidden">
                            {MARKET_TABS.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveMarket(tab);
                                        setMarketType(
                                            tab === "Futures"
                                                ? "futures"
                                                : "spot",
                                        );
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 text-[12px] font-medium transition-colors border-r border-main last:border-0",
                                        activeMarket === tab
                                            ? "bg-accent/10 text-accent"
                                            : "text-muted hover:text-main hover:bg-secondary",
                                    )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="h-4 w-px border-l border-main mx-2" />
                        <WatchlistDropdown />
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative hidden md:block">
                        <Search
                            size={13}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            type="text"
                            placeholder="Search coins..."
                            className="bg-secondary border border-transparent hover:border-main rounded-md py-1.5 pl-8 pr-3 text-[12px] w-48 focus:w-64 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                        />
                    </div>
                    <div className="h-4 w-px border-l border-main" />
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main"
                        title={`Theme: ${meta.label}`}
                    >
                        {meta.icon}
                        <span className="text-[11px] font-medium hidden sm:inline">
                            {meta.label}
                        </span>
                    </button>
                    <button
                        onClick={handleRefresh}
                        className={`p-1.5 text-muted hover:text-main rounded-md hover:bg-secondary transition-colors ${isRefreshing ? "animate-spin" : ""}`}
                    >
                        <RefreshCw size={14} />
                    </button>
                    <Link
                        href="/"
                        className="px-3.5 py-1.5 bg-accent text-white rounded-md text-[11px] font-semibold hover:bg-accent/90 transition-colors"
                    >
                        Open Chart
                    </Link>
                    <div className="h-4 w-px border-l border-main" />
                    <UserMenu />
                </div>
            </header>

            <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6 space-y-6">
                {/* ── Sub-tabs + Insights row ──────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                        {SUB_TABS.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveSubTab(tab)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors flex items-center gap-1",
                                    activeSubTab === tab
                                        ? "bg-secondary text-main border border-main"
                                        : "text-muted hover:text-main hover:bg-secondary/60",
                                )}
                            >
                                {tab}
                                {tab === "More" && <ChevronDown size={11} />}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-muted overflow-x-auto no-scrollbar">
                        <span className="flex items-center gap-1.5 whitespace-nowrap hover:text-main cursor-pointer transition-colors">
                            <TrendingUp
                                size={12}
                                className="text-emerald-500"
                            />
                            Why is the market up today?
                        </span>
                        <span className="flex items-center gap-1.5 whitespace-nowrap hover:text-main cursor-pointer transition-colors">
                            <TrendingDown size={12} className="text-rose-500" />
                            What are the trending narratives?
                        </span>
                        <span className="flex items-center gap-1.5 whitespace-nowrap hover:text-main cursor-pointer transition-colors">
                            <TrendingUp
                                size={12}
                                className="text-emerald-500"
                            />
                            Are altcoins outperforming Bitcoin?
                        </span>
                    </div>
                </div>

                {/* ── Stats Grid (6 cards) ─────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {statCards.map((s, i) => (
                        <StatCard
                            key={s.title}
                            title={s.title}
                            value={s.value}
                            change={s.change}
                            positive={s.positive}
                            sparkData={statCardSparks[i] ?? statCardSparks[0]}
                        />
                    ))}
                    <FearGreedCard />
                    <AltcoinSeasonCard />
                    <AvgRsiCard />
                </div>

                {/* ── Network Filter row ───────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {FILTER_CHIPS.map((chip) => (
                            <button
                                key={chip}
                                onClick={() => setActiveFilter(chip)}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1",
                                    activeFilter === chip
                                        ? "bg-accent text-white"
                                        : "bg-secondary border border-main text-muted hover:border-accent/40 hover:text-main",
                                )}
                            >
                                {chip}
                                {chip === "More" && <ChevronDown size={11} />}
                            </button>
                        ))}
                    </div>
                    <button className="flex items-center gap-1.5 bg-secondary border border-main px-3.5 py-1.5 rounded-lg text-[11px] text-muted hover:text-main hover:border-accent/40 transition-colors shrink-0 ml-3">
                        <Filter size={13} />
                        Filter
                    </button>
                </div>

                {/* ── Main Table ───────────────────────────────────────────── */}
                <div className="bg-secondary border border-main rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1100px]">
                            <thead>
                                <tr className="border-b border-main text-[10px] text-muted uppercase tracking-[0.12em]">
                                    <th className="px-5 py-3.5 font-semibold w-12">
                                        #
                                    </th>
                                    <th className="px-5 py-3.5 font-semibold">
                                        Name
                                    </th>
                                    <th className="px-5 py-3.5 font-semibold text-right">
                                        Price
                                    </th>
                                    <th className="px-5 py-3.5 font-semibold text-right">
                                        1h %
                                    </th>
                                    <th className="px-5 py-3.5 font-semibold text-right">
                                        24h %
                                    </th>
                                    <th className="px-5 py-3.5 font-semibold text-right">
                                        7d %
                                    </th>
                                    <th className="px-5 py-3.5 font-semibold text-right">
                                        Market Cap
                                    </th>
                                    <th className="px-5 py-3.5 font-semibold text-right">
                                        24h Volume
                                    </th>
                                    <th className="px-5 py-3.5 font-semibold text-center">
                                        Sentiment
                                    </th>
                                    <th className="px-5 py-3.5 font-semibold text-center">
                                        Last 7 Days
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-main">
                                {pagedData.map((coin, idx) => {
                                    const sparkData: { v: number }[] =
                                        coin.sparkline7d;
                                    const sparkPositive = coin.trend !== "down";
                                    return (
                                        <tr
                                            key={coin.id}
                                            onClick={() =>
                                                handleRowClick(coin.id)
                                            }
                                            className="hover:bg-main/60 transition-colors cursor-pointer group border-b border-main"
                                        >
                                            {/* # + star */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2 text-muted text-[12px]">
                                                    <Star
                                                        size={13}
                                                        className="hover:text-yellow-400 transition-colors cursor-pointer shrink-0"
                                                    />
                                                    {(page - 1) * 20 + idx + 1}
                                                </div>
                                            </td>

                                            {/* Name + symbol + buy button (hover) */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <CoinAvatar
                                                        symbol={coin.symbol}
                                                        logoUrl={coin.logoUrl}
                                                    />
                                                    <div>
                                                        <div className="text-[13px] font-bold">
                                                            {coin.name}
                                                        </div>
                                                        <div className="text-[10px] text-muted">
                                                            {coin.symbol}
                                                        </div>
                                                    </div>
                                                    <button className="ml-1 bg-accent/10 text-accent text-[10px] px-2.5 py-0.5 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity border border-accent/20">
                                                        Buy
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Price */}
                                            <td className="px-5 py-4 text-right text-[13px] font-mono font-semibold">
                                                ${priceFmt(coin.price)}
                                            </td>

                                            {/* % columns */}
                                            <PctCell v={coin.h1} />
                                            <PctCell v={coin.h24} />
                                            <PctCell v={coin.d7} />

                                            {/* Market Cap */}
                                            <td className="px-5 py-4 text-right text-[13px] text-muted">
                                                {coin.marketCap}
                                            </td>

                                            {/* Volume */}
                                            <td className="px-5 py-4 text-right text-[13px] text-muted">
                                                {coin.volume}
                                            </td>

                                            {/* Sentiment */}
                                            <td className="px-5 py-4 text-center">
                                                <SentimentBadge
                                                    v={coin.sentiment}
                                                />
                                            </td>

                                            {/* 7-day sparkline */}
                                            <td className="px-5 py-4">
                                                <div className="flex justify-center">
                                                    <MiniSparkline
                                                        data={sparkData}
                                                        positive={sparkPositive}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {pagedData.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={11}
                                            className="px-5 py-8 text-center text-[12px] text-muted"
                                        >
                                            {isLoading
                                                ? "Loading market data..."
                                                : "No data"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-center gap-1.5 py-5 border-t border-main">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="w-8 h-8 flex items-center justify-center text-muted hover:text-main hover:bg-main rounded-md transition-colors"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1,
                        ).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={cn(
                                    "w-8 h-8 rounded-full text-[12px] font-semibold transition-all",
                                    page === p
                                        ? "bg-accent text-white"
                                        : "text-muted hover:bg-main hover:text-main",
                                )}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            onClick={() =>
                                setPage((p) => Math.min(totalPages, p + 1))
                            }
                            className="w-8 h-8 flex items-center justify-center text-muted hover:text-main hover:bg-main rounded-md transition-colors"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            </main>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <footer className="border-t border-main mt-6 px-6 py-8">
                <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <Image
                            src="/logo.gif"
                            alt=""
                            width={32}
                            height={32}
                            unoptimized
                            className="rounded opacity-70"
                        />
                        <span className="text-[12px] text-muted">
                            FinTrace — Market data powered by Tung
                        </span>
                    </div>
                    <div className="flex items-center gap-5 text-[12px] text-muted">
                        <Link
                            href="/"
                            className="hover:text-main transition-colors"
                        >
                            Chart
                        </Link>
                        <Link
                            href="/settings"
                            className="hover:text-main transition-colors"
                        >
                            Settings
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
