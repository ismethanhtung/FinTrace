"use client";

import React, { useState, useMemo } from "react";
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
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useAppSettings, AppTheme } from "../../context/AppSettingsContext";
import { WatchlistDropdown } from "../../components/AssetList";
import { UserMenu } from "../../components/UserMenu";
import { cn } from "../../lib/utils";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const upSparkline = [
    { v: 10 },
    { v: 14 },
    { v: 12 },
    { v: 18 },
    { v: 15 },
    { v: 22 },
    { v: 20 },
    { v: 25 },
    { v: 24 },
    { v: 28 },
    { v: 26 },
    { v: 31 },
    { v: 30 },
    { v: 36 },
];
const downSparkline = [
    { v: 36 },
    { v: 30 },
    { v: 31 },
    { v: 26 },
    { v: 28 },
    { v: 24 },
    { v: 25 },
    { v: 20 },
    { v: 22 },
    { v: 15 },
    { v: 18 },
    { v: 12 },
    { v: 14 },
    { v: 10 },
];
const flatSparkline = [
    { v: 20 },
    { v: 22 },
    { v: 19 },
    { v: 21 },
    { v: 20 },
    { v: 22 },
    { v: 21 },
    { v: 20 },
    { v: 22 },
    { v: 20 },
    { v: 21 },
    { v: 22 },
    { v: 20 },
    { v: 21 },
];

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

const CRYPTO_DATA = [
    {
        id: 1,
        name: "Bitcoin",
        symbol: "BTC",
        price: 67420.35,
        h1: 0.12,
        h24: 2.35,
        d7: 4.18,
        marketCap: "$1.33T",
        volume: "$35.6B",
        supply: "19.7M BTC",
        sentiment: "Positive" as const,
        trend: "up" as const,
    },
    {
        id: 2,
        name: "Ethereum",
        symbol: "ETH",
        price: 3182.64,
        h1: 0.08,
        h24: 1.1,
        d7: 3.72,
        marketCap: "$382.4B",
        volume: "$17.1B",
        supply: "120.4M ETH",
        sentiment: "Positive" as const,
        trend: "up" as const,
    },
    {
        id: 3,
        name: "Binance Coin",
        symbol: "BNB",
        price: 585.74,
        h1: 0.0,
        h24: 0.01,
        d7: 0.0,
        marketCap: "$114.2B",
        volume: "$58.1B",
        supply: "147.9M BNB",
        sentiment: "Neutral" as const,
        trend: "flat" as const,
    },
    {
        id: 4,
        name: "Solana",
        symbol: "SOL",
        price: 174.18,
        h1: 0.05,
        h24: 0.88,
        d7: 2.41,
        marketCap: "$85.4B",
        volume: "$1.2B",
        supply: "467.3M SOL",
        sentiment: "Positive" as const,
        trend: "up" as const,
    },
    {
        id: 5,
        name: "Monero",
        symbol: "XMR",
        price: 182.9,
        h1: 0.22,
        h24: 3.54,
        d7: 0.95,
        marketCap: "$81.2B",
        volume: "$2.9B",
        supply: "18M XMR",
        sentiment: "Positive" as const,
        trend: "up" as const,
    },
    {
        id: 6,
        name: "USDC",
        symbol: "USDC",
        price: 1.0002,
        h1: -0.09,
        h24: -0.35,
        d7: 0.0,
        marketCap: "$35.1B",
        volume: "$1.1B",
        supply: "34.5B USDC",
        sentiment: "Negative" as const,
        trend: "down" as const,
    },
    {
        id: 7,
        name: "Pepe",
        symbol: "PEPE",
        price: 0.00001724,
        h1: 0.0,
        h24: 0.0,
        d7: 2.87,
        marketCap: "$34.6B",
        volume: "$4.3B",
        supply: "420T PEPE",
        sentiment: "Positive" as const,
        trend: "up" as const,
    },
    {
        id: 8,
        name: "XRP",
        symbol: "XRP",
        price: 0.5246,
        h1: 0.03,
        h24: -1.96,
        d7: -1.2,
        marketCap: "$15.3B",
        volume: "$512M",
        supply: "54.5B XRP",
        sentiment: "Negative" as const,
        trend: "down" as const,
    },
    {
        id: 9,
        name: "Cardano",
        symbol: "ADA",
        price: 0.4521,
        h1: 0.02,
        h24: 0.45,
        d7: 4.58,
        marketCap: "$24.2B",
        volume: "$826M",
        supply: "35.8B ADA",
        sentiment: "Positive" as const,
        trend: "up" as const,
    },
    {
        id: 10,
        name: "Dogecoin",
        symbol: "DOGE",
        price: 0.1274,
        h1: 0.1,
        h24: 2.21,
        d7: 5.24,
        marketCap: "$14.6B",
        volume: "$422M",
        supply: "139.3B DOGE",
        sentiment: "Positive" as const,
        trend: "up" as const,
    },
];

type Trend = "up" | "down" | "flat";
type Sentiment = "Positive" | "Negative" | "Neutral";

const STAT_CARDS = [
    { title: "Market Cap", value: "$7.27T", change: "+0.47%", positive: true },
    { title: "24h Volume", value: "$142.5B", change: "+12.3%", positive: true },
    {
        title: "BTC Dominance",
        value: "54.3%",
        change: "-0.8%",
        positive: false,
    },
];

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
    return (
        <div className="h-10 w-24">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
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

function PctCell({ v }: { v: number }) {
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

function CoinAvatar({ symbol }: { symbol: string }) {
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
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{
                backgroundColor: bg + "33",
                border: `1.5px solid ${bg}55`,
            }}
        >
            <span style={{ color: bg }}>{symbol[0]}</span>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MarketPage() {
    const { theme, toggleTheme } = useAppSettings();
    const [activeSubTab, setActiveSubTab] = useState("Top");
    const [activeFilter, setActiveFilter] = useState("All Network");
    const [activeMarket, setActiveMarket] = useState("Spot");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const meta = THEME_META[theme];

    const filteredData = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return CRYPTO_DATA;
        return CRYPTO_DATA.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.symbol.toLowerCase().includes(q),
        );
    }, [search]);

    function handleRefresh() {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
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
                                    onClick={() => setActiveMarket(tab)}
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
                    {STAT_CARDS.map((s, i) => (
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
                                    <th className="px-5 py-3.5 font-semibold text-right">
                                        Circ. Supply
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
                                {filteredData.map((coin) => {
                                    const sparkData: { v: number }[] =
                                        coin.trend === "up"
                                            ? upSparkline
                                            : coin.trend === "down"
                                              ? downSparkline
                                              : flatSparkline;
                                    const sparkPositive = coin.trend !== "down";
                                    return (
                                        <tr
                                            key={coin.id}
                                            className="hover:bg-main/60 transition-colors cursor-pointer group border-b border-main"
                                        >
                                            {/* # + star */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2 text-muted text-[12px]">
                                                    <Star
                                                        size={13}
                                                        className="hover:text-yellow-400 transition-colors cursor-pointer shrink-0"
                                                    />
                                                    {coin.id}
                                                </div>
                                            </td>

                                            {/* Name + symbol + buy button (hover) */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <CoinAvatar
                                                        symbol={coin.symbol}
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

                                            {/* Supply */}
                                            <td className="px-5 py-4 text-right text-[12px] text-muted">
                                                {coin.supply}
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
                        {[1, 2, 3, 4, 5].map((p) => (
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
                            onClick={() => setPage((p) => Math.min(5, p + 1))}
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
