"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Globe,
    Menu,
    Search,
    Share2,
    Zap,
} from "lucide-react";
import {
    JetBrains_Mono,
    Libre_Baskerville,
    Playfair_Display,
} from "next/font/google";
import { useMarket } from "../../context/MarketContext";

const displayFont = Playfair_Display({
    subsets: ["latin"],
    variable: "--font-news-display",
    weight: ["400", "700", "900"],
    style: ["normal", "italic"],
});

const serifFont = Libre_Baskerville({
    subsets: ["latin"],
    variable: "--font-news-serif",
    weight: ["400", "700"],
    style: ["normal", "italic"],
});

const monoFont = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-news-mono",
    weight: ["400", "700"],
});

function formatCompactUsd(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return "-";
    if (value >= 1_000_000_000_000)
        return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (value >= 1_000_000_000)
        return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
}

const fallbackCryptoPrices = [
    {
        name: "Bitcoin",
        symbol: "BTC",
        price: "$64,231.50",
        change: "+2.4%",
        up: true,
    },
    {
        name: "Ethereum",
        symbol: "ETH",
        price: "$3,452.12",
        change: "-1.2%",
        up: false,
    },
    {
        name: "Solana",
        symbol: "SOL",
        price: "$145.80",
        change: "+5.7%",
        up: true,
    },
    {
        name: "Cardano",
        symbol: "ADA",
        price: "$0.45",
        change: "+0.1%",
        up: true,
    },
    {
        name: "Polkadot",
        symbol: "DOT",
        price: "$7.20",
        change: "-3.4%",
        up: false,
    },
];

const trendingStories = [
    { title: "The brand new Hollywood horror movie is here!", imgSeed: "h1" },
    { title: "The smoking hero of Vela and Gobson!", imgSeed: "h2" },
    { title: "Elizabeth Taylor's Life In Front Of The Camera", imgSeed: "h3" },
];

export const NewsPageClient = () => {
    const router = useRouter();
    const { assets, setSelectedSymbol } = useMarket();
    const [isMarketMenuOpen, setIsMarketMenuOpen] = useState(false);
    const [marketQuery, setMarketQuery] = useState("");
    const marketMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (
                marketMenuRef.current &&
                !marketMenuRef.current.contains(event.target as Node)
            ) {
                setIsMarketMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsMarketMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const totalQuoteVolume24h = assets.reduce(
        (sum, asset) => sum + (asset.quoteVolumeRaw || 0),
        0,
    );
    const btcAsset = assets.find((asset) => asset.id === "BTCUSDT");
    const volume24h = formatCompactUsd(totalQuoteVolume24h);
    const btcDominance =
        totalQuoteVolume24h > 0 && btcAsset
            ? `${((btcAsset.quoteVolumeRaw / totalQuoteVolume24h) * 100).toFixed(2)}%`
            : "-";

    const cryptoPrices =
        assets.length > 0
            ? assets.slice(0, 5).map((asset) => ({
                  name: asset.name,
                  symbol: asset.symbol,
                  price: `$${asset.price.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                  })}`,
                  change: `${asset.changePercent >= 0 ? "+" : ""}${asset.changePercent.toFixed(2)}%`,
                  up: asset.changePercent >= 0,
              }))
            : fallbackCryptoPrices;

    const filteredMarketAssets = useMemo(() => {
        const q = marketQuery.trim().toLowerCase();
        if (!q) return assets.slice(0, 12);

        return assets
            .filter(
                (asset) =>
                    asset.symbol.toLowerCase().includes(q) ||
                    asset.name.toLowerCase().includes(q) ||
                    asset.id.toLowerCase().includes(q),
            )
            .slice(0, 20);
    }, [assets, marketQuery]);

    const handleMarketSelect = (symbolId: string) => {
        setSelectedSymbol(symbolId);
        setIsMarketMenuOpen(false);
        setMarketQuery("");
        router.push("/");
    };

    const currentDate = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div
            className={`${displayFont.variable} ${serifFont.variable} ${monoFont.variable} news-page min-h-screen selection:bg-black selection:text-white pb-12`}
        >
            <div className="news-paper-texture" aria-hidden />

            <div className="news-content-layer">
                <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] news-font-mono border-b border-black">
                    <div className="flex gap-6">
                        <span>Vol. CLXXIV ... No. 59,234</span>
                        <span className="hidden md:inline">
                            Weather: Overcast 64°F
                        </span>
                    </div>
                    <div className="flex gap-6">
                        <span className="font-bold">Price: $0.25</span>
                        <span className="hidden sm:inline">
                            Late City Edition
                        </span>
                    </div>
                </div>

                <nav className="max-w-7xl mx-auto px-4 py-3 border-b border-black flex flex-wrap items-center gap-x-8 gap-y-2 text-[11px] font-bold uppercase tracking-wider relative">
                    <Link
                        href="/"
                        className="hover:italic transition-all inline-flex items-center gap-2"
                    >
                        <img
                            src="/logo.gif"
                            alt="FinTrace logo"
                            className="h-6 w-6 object-contain"
                        />
                        FinTrace
                    </Link>
                    <Link href="/" className="hover:italic transition-all">
                        Home
                    </Link>
                    <Link href="/market" className="hover:italic transition-all">
                        Markets
                    </Link>
                    <Link href="/heatmap" className="hover:italic transition-all">
                        Heatmap
                    </Link>
                    <Link href="/news" className="italic transition-all">
                        News
                    </Link>
                    <div ref={marketMenuRef} className="relative">
                        <button
                            type="button"
                            onClick={() =>
                                setIsMarketMenuOpen((prevOpen) => !prevOpen)
                            }
                            className="hover:italic transition-all inline-flex items-center gap-1"
                            aria-expanded={isMarketMenuOpen}
                            aria-label="Open market dropdown"
                        >
                            SEARCH
                            <ChevronDown
                                size={12}
                                className={`transition-transform ${isMarketMenuOpen ? "rotate-180" : ""}`}
                            />
                        </button>

                        {isMarketMenuOpen && (
                            <div className="absolute left-0 top-full mt-2 w-[min(92vw,22rem)] z-50 bg-[#f4f1ea] border border-black shadow-[4px_4px_0_#1a1a1a] normal-case tracking-normal">
                                <div className="p-3 border-b border-black/20">
                                    <div className="relative">
                                        <Search
                                            size={12}
                                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/50"
                                        />
                                        <input
                                            type="text"
                                            value={marketQuery}
                                            onChange={(event) =>
                                                setMarketQuery(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Search coin..."
                                            className="w-full bg-transparent border border-black/30 py-1.5 pl-8 pr-2 text-[11px] news-font-mono focus:outline-none focus:border-black"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="max-h-80 overflow-y-auto">
                                    {filteredMarketAssets.length === 0 ? (
                                        <p className="px-3 py-5 text-[11px] news-font-mono opacity-60">
                                            No matching coins.
                                        </p>
                                    ) : (
                                        filteredMarketAssets.map((asset) => (
                                            <button
                                                key={asset.id}
                                                type="button"
                                                onClick={() =>
                                                    handleMarketSelect(asset.id)
                                                }
                                                className="w-full px-3 py-2 border-b border-black/10 last:border-0 hover:bg-black hover:text-white transition-colors text-left flex items-center justify-between gap-4"
                                            >
                                                <span className="text-[11px] font-bold uppercase tracking-wide">
                                                    {asset.symbol}
                                                </span>
                                                <span className="text-[10px] news-font-mono">
                                                    ${asset.price.toLocaleString("en-US", {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                        <Search size={14} />
                        <Menu size={14} />
                    </div>
                </nav>

                <header className="max-w-7xl mx-auto px-4 py-8 md:py-12 text-center border-b-4 border-black">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="hidden md:block w-48 text-left">
                            <p className="text-[10px] news-font-mono uppercase leading-tight">
                                "All the News That's
                                <br />
                                Fit to Print"
                            </p>
                        </div>
                        
                        <h1 className="news-font-display font-black text-6xl md:text-8xl lg:text-9xl tracking-tighter italic">
                            <span className="inline-flex items-center gap-3 md:gap-5">
                                <span>FinTrace</span>
                            </span>
                        </h1>

                        <div className="hidden md:block w-48 text-right">
                            <p className="text-[10px] news-font-mono uppercase leading-tight">
                                Established 2016
                                <br />
                                Ho Chi Minh City , Tuesday
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 py-2 border-y border-black flex justify-center items-center gap-4 text-xs news-font-mono uppercase tracking-widest">
                        <span>{currentDate}</span>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto px-4 py-2 border-b border-black overflow-hidden whitespace-nowrap bg-black/5">
                    <div className="news-marquee-track flex gap-8 news-font-mono text-[9px] uppercase tracking-widest">
                        {[...cryptoPrices, ...cryptoPrices].map((coin, i) => (
                            <span
                                key={`${coin.symbol}-${i}`}
                                className="flex items-center gap-2"
                            >
                                <span className="font-bold">{coin.symbol}</span>
                                <span>{coin.price}</span>
                                <span
                                    className={
                                        coin.up
                                            ? "text-green-700"
                                            : "text-red-700"
                                    }
                                >
                                    {coin.change} {coin.up ? "▲" : "▼"}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>

                <main className="max-w-7xl mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <aside className="lg:col-span-3 order-2 lg:order-1 flex flex-col gap-8">
                            <div className="news-newspaper-border p-4 bg-white/50">
                                <h4 className="news-font-display font-bold text-lg border-b border-black pb-2 mb-4 flex items-center justify-between">
                                    Market Watch
                                    <Globe size={14} />
                                </h4>
                                <table className="w-full text-[10px] news-font-mono border-collapse">
                                    <thead>
                                        <tr className="border-b border-black/20 text-left">
                                            <th className="pb-2">Asset</th>
                                            <th className="pb-2">Price</th>
                                            <th className="pb-2 text-right">
                                                Chg%
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cryptoPrices.map((coin) => (
                                            <tr
                                                key={coin.symbol}
                                                className="border-b border-black/5 last:border-0"
                                            >
                                                <td className="py-2 font-bold">
                                                    {coin.symbol}
                                                </td>
                                                <td className="py-2">
                                                    {coin.price}
                                                </td>
                                                <td
                                                    className={`py-2 text-right ${coin.up ? "text-green-700" : "text-red-700"}`}
                                                >
                                                    {coin.change}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-4 pt-2 border-t border-black/10 text-[8px] italic opacity-60">
                                    * Data delayed by 30 seconds. Source:
                                    FinTrace.
                                </div>
                            </div>

                            <div className="news-newspaper-divider" />

                            <article className="group cursor-pointer">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-black text-white px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest">
                                        Analysis
                                    </span>
                                    <span className="text-[9px] news-font-mono text-gray-500">
                                        22h ago
                                    </span>
                                </div>
                                <h3 className="news-font-display font-bold text-xl leading-[1.1] mb-3 group-hover:underline">
                                    Bitcoin Is Headed to $500,000 According to
                                    This Wall Street Analyst and the Reasoning
                                    Is Hard to Dismiss
                                </h3>
                                <p className="text-xs leading-relaxed opacity-70 mb-3 italic">
                                    "The mathematical certainty of scarcity
                                    combined with institutional adoption creates
                                    a pressure cooker for valuation," says
                                    senior strategist.
                                </p>
                                <div className="flex items-center justify-between text-[9px] news-font-mono uppercase border-t border-black/10 pt-2">
                                    <span className="font-bold">
                                        Yahoo Finance
                                    </span>
                                    <ArrowRight size={10} />
                                </div>
                            </article>

                            <div className="news-newspaper-divider" />

                            <article className="group cursor-pointer">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="border border-black px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest">
                                        Breaking
                                    </span>
                                    <span className="text-[9px] news-font-mono text-gray-500">
                                        4h ago
                                    </span>
                                </div>
                                <h3 className="news-font-display font-bold text-lg leading-tight mb-2 group-hover:underline">
                                    Federal Reserve Signals Potential Rate Cut
                                    in Q3
                                </h3>
                                <p className="text-xs leading-snug opacity-80">
                                    Inflation data shows cooling trends,
                                    prompting a shift in monetary policy stance
                                    that has markets rallying across the board.
                                </p>
                            </article>

                            <div className="bg-black text-white p-6 text-center mt-4">
                                <p className="text-[10px] news-font-mono uppercase tracking-[0.3em] mb-4">
                                    Advertisement
                                </p>
                                <h4 className="news-font-display italic text-3xl mb-2">
                                    Dream Lover
                                </h4>
                                <p className="text-[10px] news-font-mono uppercase mb-4">
                                    The Bobby Darin Story
                                </p>
                                <button className="border border-white/30 px-4 py-2 text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                                    Book Now
                                </button>
                            </div>
                        </aside>

                        <section className="lg:col-span-6 order-1 lg:order-2 border-x-0 lg:border-x border-black lg:px-8">
                            <article className="group">
                                <div className="aspect-video overflow-hidden mb-6 grayscale contrast-110 border border-black relative">
                                    <img
                                        src="https://picsum.photos/seed/vintage-main/800/450"
                                        alt="Main News"
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute top-4 left-4 bg-black text-white px-2 py-1 text-[9px] uppercase tracking-widest font-bold">
                                        Must Read
                                    </div>
                                </div>

                                <h2 className="news-font-display font-black text-4xl md:text-5xl lg:text-6xl leading-[0.9] mb-6 tracking-tight">
                                    Hollywood goes Ga-ga over the thin man, just
                                    released!
                                </h2>

                                <div className="flex items-center gap-4 mb-8 pb-4 border-b border-black/10">
                                    <div className="w-12 h-12 rounded-full grayscale border border-black overflow-hidden">
                                        <img
                                            src="https://picsum.photos/seed/author/100/100"
                                            alt="Author"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-tighter">
                                            Tim William Petre
                                        </p>
                                        <p className="text-[10px] news-font-mono text-gray-500">
                                            March 22, 1966
                                        </p>
                                    </div>
                                    <div className="ml-auto flex gap-2">
                                        <button className="p-2 border border-black/20 rounded-full hover:bg-black hover:text-white transition-colors">
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 text-lg leading-relaxed news-drop-cap">
                                    <p>
                                        A few of these women had tried analysis,
                                        but none had ever been given
                                        prescriptions from their psychiatrists.
                                        Yet LSD was seen as a powerful tool to
                                        break through confusion and inhibition.
                                    </p>
                                    <p>
                                        The cinematic landscape is shifting
                                        beneath our feet as the latest
                                        production from the studio system
                                        challenges every convention we've held
                                        dear for decades. Critics are divided,
                                        but the public is mesmerized by the
                                        sheer audacity of the vision presented
                                        on the silver screen.
                                    </p>
                                </div>

                                <div className="news-newspaper-divider-thick my-8" />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <article className="group cursor-pointer">
                                        <h4 className="news-font-display font-bold text-xl mb-2 group-hover:underline italic">
                                            The Future of Decentralized Finance
                                        </h4>
                                        <p className="text-sm leading-relaxed opacity-80">
                                            As traditional banking systems face
                                            unprecedented scrutiny, a new wave
                                            of digital protocols is emerging to
                                            redefine how we store and transfer
                                            value.
                                        </p>
                                        <div className="mt-2 text-[9px] news-font-mono uppercase text-gray-500">
                                            By Sarah Jenkins • 6 min read
                                        </div>
                                    </article>
                                    <article className="group cursor-pointer">
                                        <h4 className="news-font-display font-bold text-xl mb-2 group-hover:underline italic">
                                            Regulatory Storm Clouds Gather
                                        </h4>
                                        <p className="text-sm leading-relaxed opacity-80">
                                            Global regulators are meeting in
                                            Basel this week to discuss a unified
                                            framework for digital assets, with
                                            implications for every major
                                            exchange.
                                        </p>
                                        <div className="mt-2 text-[9px] news-font-mono uppercase text-gray-500">
                                            By Marcus Thorne • 4 min read
                                        </div>
                                    </article>
                                </div>

                                <div className="mt-12 flex justify-between items-center py-4 border-y-2 border-black">
                                    <div className="flex gap-4">
                                        <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:italic">
                                            <ChevronLeft size={14} />
                                            Previous
                                        </button>
                                    </div>
                                    <div className="flex gap-4">
                                        <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:italic">
                                            Next
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </article>
                        </section>

                        <aside className="lg:col-span-3 order-3 flex flex-col gap-8">
                            <div className="news-newspaper-border p-4 bg-black text-white">
                                <h5 className="text-[10px] news-font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Zap
                                        size={12}
                                        className="text-yellow-400"
                                    />
                                    Flash Report
                                </h5>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[9px] uppercase opacity-60">
                                            24h Volume
                                        </p>
                                        <p className="text-xl news-font-display italic">
                                            {volume24h}
                                        </p>
                                        <p className="text-[9px] text-green-400">
                                            ▲ +0.00%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] uppercase opacity-60">
                                            BTC Dominance
                                        </p>
                                        <p className="text-xl news-font-display italic">
                                            {btcDominance}
                                        </p>
                                        <p className="text-[9px] text-green-400">
                                            ▲ 0.00%
                                        </p>
                                    </div>
                                    <div className="pt-2 border-t border-white/20">
                                        <p className="text-[8px] leading-tight opacity-80">
                                            "Volatility is the price of
                                            admission for the future of money."
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] news-font-mono uppercase tracking-[0.2em] border-b border-black pb-2">
                                    Trending Stories
                                </h4>

                                {trendingStories.map((item, i) => (
                                    <article
                                        key={item.imgSeed}
                                        className="flex gap-3 group cursor-pointer"
                                    >
                                        <div className="w-20 h-16 grayscale border border-black shrink-0 overflow-hidden">
                                            <img
                                                src={`https://picsum.photos/seed/${item.imgSeed}/100/100`}
                                                alt={`Trending story ${i + 1}`}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                        <h5 className="text-xs font-bold leading-tight group-hover:underline">
                                            {item.title}
                                        </h5>
                                    </article>
                                ))}
                            </div>

                            <div className="news-newspaper-divider-thick pt-6">
                                <h4 className="news-font-display font-bold text-xl mb-2">
                                    Subscribe to all the news
                                </h4>
                                <p className="text-[10px] news-font-mono uppercase text-gray-500 mb-4">
                                    Never miss the latest updates.
                                </p>
                                <div className="space-y-3">
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        className="w-full bg-transparent border-b border-black py-2 text-sm focus:outline-none focus:border-b-2 placeholder:text-black/30"
                                    />
                                    <button className="w-full bg-black text-white py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-colors">
                                        Sign Me Up
                                    </button>
                                </div>
                            </div>
                        </aside>
                    </div>
                </main>

                <footer className="max-w-7xl mx-auto px-4 py-12 border-t-4 border-black mt-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                        <div className="md:col-span-1">
                            <h2 className="news-font-display font-black text-3xl italic mb-4">
                                FinTrace
                            </h2>
                            <p className="text-[10px] news-font-mono uppercase leading-relaxed opacity-60">
                                The world's premier source for news, culture,
                                and editorial excellence since 1851.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:col-span-2">
                            <div className="space-y-2">
                                <h5 className="text-[10px] font-bold uppercase tracking-widest mb-4">
                                    Sections
                                </h5>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    World News
                                </a>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    Politics
                                </a>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    Economy
                                </a>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    Society
                                </a>
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-[10px] font-bold uppercase tracking-widest mb-4">
                                    Support
                                </h5>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    Help Center
                                </a>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    Subscriptions
                                </a>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    Gift Cards
                                </a>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    Contact Us
                                </a>
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <h5 className="text-[10px] font-bold uppercase tracking-widest mb-4">
                                Follow Us
                            </h5>
                            <div className="flex gap-4">
                                {["FB", "TW", "IG"].map((social) => (
                                    <div
                                        key={social}
                                        className="w-8 h-8 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-all cursor-pointer"
                                    >
                                        <span className="text-[10px] font-bold">
                                            {social}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-black/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] news-font-mono uppercase tracking-widest opacity-50">
                        <p>© 2026 The FinTrace Company. All rights reserved.</p>
                        <div className="flex gap-6">
                            <a href="#">Privacy Policy</a>
                            <a href="#">Terms of Service</a>
                            <a href="#">Cookie Settings</a>
                        </div>
                    </div>
                </footer>
            </div>

            <style jsx global>{`
                .news-page {
                    background-color: #f4f1ea;
                    color: #1a1a1a;
                    font-family: var(--font-news-serif), serif;
                }

                .news-font-display {
                    font-family: var(--font-news-display), serif;
                }

                .news-font-mono {
                    font-family: var(--font-news-mono), monospace;
                }

                .news-paper-texture {
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    opacity: 0.03;
                    background-image: url("https://www.transparenttextures.com/patterns/paper-fibers.png");
                    z-index: 0;
                }

                .news-content-layer {
                    position: relative;
                    z-index: 1;
                }

                .news-newspaper-border {
                    border: 1px solid #1a1a1a;
                }

                .news-newspaper-divider {
                    border-top: 1px solid #1a1a1a;
                }

                .news-newspaper-divider-thick {
                    border-top: 4px solid #1a1a1a;
                }

                .news-drop-cap::first-letter {
                    font-family: var(--font-news-display), serif;
                    font-weight: 900;
                    font-size: 4rem;
                    float: left;
                    line-height: 1;
                    padding-right: 8px;
                    margin-top: 4px;
                }

                .news-marquee-track {
                    width: max-content;
                    animation: news-marquee 32s linear infinite;
                }

                @keyframes news-marquee {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }
            `}</style>
        </div>
    );
};
