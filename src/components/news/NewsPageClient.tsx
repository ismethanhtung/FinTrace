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
import { useUniverse } from "../../context/UniverseContext";
import { NewsPageAiSummaryTooltip } from "./NewsPageAiSummaryTooltip";
import { WorldSwitch } from "../shell/WorldSwitch";
import { useI18n } from "../../context/I18nContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface NewsArticle {
    id: string;
    title: string;
    url: string;
    source: string;
    publishedAt: string;
    relativeTime: string;
    description?: string;
}

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

// ─── Constants ─────────────────────────────────────────────────────────────────
const ARTICLES_PER_PAGE = 18; // 4 left + 7 center + 7 right
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

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

const LEFT_SKELETON_COUNT = 4;
const CENTER_GRID_SKELETON_COUNT = 4;
const RIGHT_SKELETON_COUNT = 5;

export const NewsPageClient = () => {
    const { t, locale } = useI18n();
    const router = useRouter();
    const { assets, setSelectedSymbol } = useMarket();
    const { universe } = useUniverse();
    const [isMarketMenuOpen, setIsMarketMenuOpen] = useState(false);
    const [marketQuery, setMarketQuery] = useState("");
    const marketMenuRef = useRef<HTMLDivElement>(null);

    // ─── News State ────────────────────────────────────────────────────────────
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [isLoadingNews, setIsLoadingNews] = useState(true);
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // ─── Fetch news from API ───────────────────────────────────────────────────
    const fetchNews = async () => {
        try {
            const res = await fetch(
                `/api/general-news?limit=90&universe=${encodeURIComponent(universe)}`,
            );
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const data = await res.json();
            if (data.articles && Array.isArray(data.articles)) {
                setArticles(data.articles);
                setCurrentPage(0); // Reset to first page on refresh
            }
        } catch (error) {
            console.error("Failed to fetch news:", error);
            // Fallback: keep existing articles if API fails
        } finally {
            setIsLoadingNews(false);
        }
    };

    // ─── Setup news fetching and auto-refresh ──────────────────────────────────
    useEffect(() => {
        // Fetch on mount
        fetchNews();

        // Setup auto-refresh every 30 minutes
        refreshIntervalRef.current = setInterval(() => {
            fetchNews();
        }, REFRESH_INTERVAL_MS);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [universe]);

    // ─── Pagination helpers ────────────────────────────────────────────────────
    const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);
    const startIdx = currentPage * ARTICLES_PER_PAGE;
    const endIdx = startIdx + ARTICLES_PER_PAGE;
    const currentArticles = articles.slice(startIdx, endIdx);

    // Split articles into columns
    const leftArticles = currentArticles.slice(0, 4); // 4 articles
    const centerArticles = currentArticles.slice(4, 11); // 7 articles
    const rightArticles = currentArticles.slice(11, 18); // 7 articles

    const handlePrevious = () => {
        if (totalPages === 0) return;
        setCurrentPage((prev) => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        if (totalPages === 0) return;
        setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
    };

    // ─── Format time helper ────────────────────────────────────────────────────
    const formatTimeAgo = (isoDate: string): string => {
        const diff = Date.now() - new Date(isoDate).getTime();
        const mins = Math.floor(diff / 60_000);
        const hours = Math.floor(diff / 3_600_000);
        const days = Math.floor(diff / 86_400_000);
        if (mins < 2) return t("newsPage.justNow");
        if (mins < 60) return t("newsPage.minutesAgo", { count: mins });
        if (hours < 24) return t("newsPage.hoursAgo", { count: hours });
        return t("newsPage.daysAgo", { count: days });
    };

    // ─── Existing market menu logic ─────────────────────────────────────────────
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

    const currentDate = new Date().toLocaleDateString(
        locale === "vi" ? "vi-VN" : "en-US",
        {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        },
    );
    const isInitialNewsLoading = isLoadingNews && articles.length === 0;

    return (
        <div
            className={`${displayFont.variable} ${serifFont.variable} ${monoFont.variable} news-page min-h-screen selection:bg-black selection:text-white pb-12`}
        >
            <div className="news-paper-texture" aria-hidden />

            <div className="news-content-layer">
                <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] news-font-mono border-b border-black">
                    <div className="flex gap-6">
                        <span>{t("newsPage.editionInfo")}</span>
                        <span className="hidden md:inline">
                            {t("newsPage.weather")}
                        </span>
                    </div>
                    <div className="flex gap-6">
                        <span className="font-bold">
                            {t("newsPage.newspaperPrice")}
                        </span>
                        <span className="hidden sm:inline">
                            {t("newsPage.lateCityEdition")}
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
                            alt={t("topbar.logoAlt")}
                            className="h-6 w-6 object-contain"
                        />
                        FinTrace
                    </Link>
                    <Link href="/" className="hover:italic transition-all">
                        {t("newsPage.home")}
                    </Link>
                    <Link
                        href="/market"
                        className="hover:italic transition-all"
                    >
                        {t("newsPage.markets")}
                    </Link>
                    <Link
                        href="/heatmap"
                        className="hover:italic transition-all"
                    >
                        {t("newsPage.heatmap")}
                    </Link>
                    <Link href="/news" className="italic transition-all">
                        {t("newsPage.news")}
                    </Link>
                    <WorldSwitch />
                    <div ref={marketMenuRef} className="relative">
                        <button
                            type="button"
                            onClick={() =>
                                setIsMarketMenuOpen((prevOpen) => !prevOpen)
                            }
                            className="hover:italic transition-all inline-flex items-center gap-1"
                            aria-expanded={isMarketMenuOpen}
                            aria-label={t("newsPage.openMarketDropdown")}
                        >
                            {t("newsPage.search")}
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
                                            placeholder={t(
                                                "newsPage.searchAsset",
                                            )}
                                            className="w-full bg-transparent border border-black/30 py-1.5 pl-8 pr-2 text-[11px] news-font-mono focus:outline-none focus:border-black"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="max-h-80 overflow-y-auto">
                                    {filteredMarketAssets.length === 0 ? (
                                        <p className="px-3 py-5 text-[11px] news-font-mono opacity-60">
                                            {t("newsPage.noMatchingAssets")}
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
                                                    $
                                                    {asset.price.toLocaleString(
                                                        "en-US",
                                                        {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        },
                                                    )}
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
                                "{t("newsPage.headerMottoLine1")}
                                <br />
                                {t("newsPage.headerMottoLine2")}"
                            </p>
                        </div>

                        <h1 className="news-font-display font-black text-6xl md:text-8xl lg:text-9xl tracking-tighter italic">
                            <span className="inline-flex items-center gap-3 md:gap-5">
                                <span>FinTrace</span>
                            </span>
                        </h1>

                        <div className="hidden md:block w-48 text-right">
                            <p className="text-[10px] news-font-mono uppercase leading-tight">
                                {t("newsPage.established2026")}
                                <br />
                                {t("newsPage.cityDateLine")}
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
                                    {t("newsPage.marketWatch")}
                                    <Globe size={14} />
                                </h4>
                                <table className="w-full text-[10px] news-font-mono border-collapse">
                                    <thead>
                                        <tr className="border-b border-black/20 text-left">
                                            <th className="pb-2">
                                                {t("newsPage.asset")}
                                            </th>
                                            <th className="pb-2">
                                                {t("newsPage.price")}
                                            </th>
                                            <th className="pb-2 text-right">
                                                {t("newsPage.changePercent")}
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
                                    {t("newsPage.dataDelayedNote")}
                                </div>
                            </div>

                            <div className="news-newspaper-divider" />

                            {/* Left column articles */}
                            <div className="space-y-8">
                                {isInitialNewsLoading
                                    ? Array.from({
                                          length: LEFT_SKELETON_COUNT,
                                      }).map((_, idx) => (
                                          <article
                                              key={`left-skeleton-${idx}`}
                                              className="space-y-3 animate-pulse"
                                          >
                                              <div className="h-4 w-2/3 bg-black/10" />
                                              <div className="space-y-2">
                                                  <div className="h-4 w-full bg-black/15" />
                                                  <div className="h-4 w-5/6 bg-black/10" />
                                                  <div className="h-4 w-4/6 bg-black/10" />
                                              </div>
                                              <div className="h-3 w-1/3 bg-black/10" />
                                          </article>
                                      ))
                                    : leftArticles.map((article, idx) => (
                                          <article
                                              key={article.id}
                                              className="group cursor-pointer hover:opacity-80 transition-opacity"
                                          >
                                              <div className="flex items-center justify-between gap-2 mb-2">
                                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                      <span
                                                          className={`${idx === 0 ? "bg-black text-white" : "border border-black"} px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest`}
                                                      >
                                                          {idx === 0
                                                              ? t(
                                                                    "newsPage.analysis",
                                                                )
                                                              : t(
                                                                    "newsPage.breaking",
                                                                )}
                                                      </span>
                                                      <span className="text-[9px] news-font-mono text-gray-500">
                                                          {article.relativeTime}
                                                      </span>
                                                  </div>
                                                  <NewsPageAiSummaryTooltip
                                                      article={article}
                                                  />
                                              </div>
                                              <a
                                                  href={article.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="block"
                                                  aria-label={article.title}
                                              >
                                                  <h3 className="news-font-display font-bold text-lg leading-tight mb-2 group-hover:underline">
                                                      {article.title}
                                                  </h3>
                                              </a>
                                              {article.description && (
                                                  <p className="text-xs leading-snug opacity-70">
                                                      {article.description.substring(
                                                          0,
                                                          100,
                                                      )}
                                                      ...
                                                  </p>
                                              )}
                                              <div className="flex items-center justify-between text-[9px] news-font-mono uppercase border-t border-black/10 pt-2 mt-2">
                                                  <span className="font-bold">
                                                      {article.source}
                                                  </span>
                                                  <ArrowRight size={10} />
                                              </div>
                                          </article>
                                      ))}
                            </div>

                            <div className="bg-black text-white p-6 text-center mt-4">
                                <p className="text-[10px] news-font-mono uppercase tracking-[0.3em] mb-4">
                                    {t("newsPage.openToOpportunities")}
                                </p>
                                <h4 className="news-font-display italic text-2xl md:text-3xl mb-2 leading-tight">
                                    Nguyen Thanh Tung
                                </h4>
                                <p className="text-[10px] news-font-mono uppercase mb-1 opacity-90">
                                    {t("newsPage.softwareEngineer")}
                                </p>
                                <p className="text-[9px] news-font-mono leading-relaxed opacity-75 mb-4 max-w-[14rem] mx-auto">
                                    {t("newsPage.profileTagline")}
                                </p>
                                <a
                                    href="mailto:?subject=Opportunity%20%E2%80%94%20Nguyen%20Thanh%20Tung&body=Hi%20Tung%2C%0A%0AWe%27d%20like%20to%20discuss%20a%20role%20with%20you.%0A%0A"
                                    className="inline-block border border-white/30 px-4 py-2 text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                                >
                                    {t("newsPage.hireMe")}
                                </a>
                            </div>
                        </aside>

                        <section className="lg:col-span-6 order-1 lg:order-2 border-x-0 lg:border-x border-black lg:px-8">
                            {isInitialNewsLoading ? (
                                <>
                                    <article className="mb-8 pb-8 border-b border-black animate-pulse">
                                        <div className="aspect-video mb-6 border border-black bg-black/10" />
                                        <div className="space-y-3 mb-6">
                                            <div className="h-7 w-full bg-black/15" />
                                            <div className="h-7 w-5/6 bg-black/10" />
                                        </div>
                                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-black/10">
                                            <div className="w-12 h-12 rounded-full border border-black bg-black/10" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-3 w-28 bg-black/10" />
                                                <div className="h-3 w-20 bg-black/10" />
                                            </div>
                                            <div className="h-8 w-20 bg-black/10" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-full bg-black/10" />
                                            <div className="h-4 w-4/5 bg-black/10" />
                                        </div>
                                    </article>

                                    <div className="news-newspaper-divider-thick my-8" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-black">
                                        {Array.from({
                                            length: CENTER_GRID_SKELETON_COUNT,
                                        }).map((_, idx) => (
                                            <article
                                                key={`center-skeleton-${idx}`}
                                                className="space-y-3 animate-pulse"
                                            >
                                                <div className="h-5 w-11/12 bg-black/15" />
                                                <div className="h-5 w-3/4 bg-black/10" />
                                                <div className="space-y-2">
                                                    <div className="h-3 w-full bg-black/10" />
                                                    <div className="h-3 w-5/6 bg-black/10" />
                                                </div>
                                                <div className="h-3 w-2/3 bg-black/10" />
                                            </article>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Main featured article (first center article or a featured article) */}
                                    {centerArticles.length > 0 && (
                                        <article className="group mb-8 pb-8 border-b border-black">
                                            <a
                                                href={centerArticles[0].url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block"
                                                aria-label={
                                                    centerArticles[0].title
                                                }
                                            >
                                                <div className="aspect-video overflow-hidden mb-6 grayscale contrast-110 border border-black relative bg-black/5">
                                                    <img
                                                        src={`https://picsum.photos/seed/${centerArticles[0].id}/800/450`}
                                                        alt={
                                                            centerArticles[0]
                                                                .title
                                                        }
                                                        className="w-full h-full object-cover"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    <div className="absolute top-4 left-4 bg-black text-white px-2 py-1 text-[9px] uppercase tracking-widest font-bold">
                                                        {t("newsPage.mustRead")}
                                                    </div>
                                                </div>
                                            </a>

                                            <a
                                                href={centerArticles[0].url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block"
                                                aria-label={
                                                    centerArticles[0].title
                                                }
                                            >
                                                <h2 className="news-font-display font-black text-3xl md:text-4xl lg:text-5xl leading-[0.9] mb-6 tracking-tight group-hover:underline">
                                                    {centerArticles[0].title}
                                                </h2>
                                            </a>

                                            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-black/10">
                                                <div className="w-12 h-12 rounded-full grayscale border border-black overflow-hidden bg-black/5">
                                                    <img
                                                        src={`https://picsum.photos/seed/author-${centerArticles[0].id}/100/100`}
                                                        alt={t(
                                                            "newsPage.author",
                                                        )}
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-tighter">
                                                        {
                                                            centerArticles[0]
                                                                .source
                                                        }
                                                    </p>
                                                    <p className="text-[10px] news-font-mono text-gray-500">
                                                        {centerArticles[0]
                                                            .relativeTime ||
                                                            formatTimeAgo(
                                                                centerArticles[0]
                                                                    .publishedAt,
                                                            )}
                                                    </p>
                                                </div>
                                                <div className="ml-auto flex gap-2 items-center">
                                                    <NewsPageAiSummaryTooltip
                                                        article={
                                                            centerArticles[0]
                                                        }
                                                        buttonClassName="p-2 rounded-full border-black/20"
                                                    />
                                                    <a
                                                        href={
                                                            centerArticles[0]
                                                                .url
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 border border-black/20 rounded-full hover:bg-black hover:text-white transition-colors"
                                                    >
                                                        <Share2 size={14} />
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="space-y-3 text-base leading-relaxed">
                                                {centerArticles[0]
                                                    .description && (
                                                    <p>
                                                        {
                                                            centerArticles[0]
                                                                .description
                                                        }
                                                    </p>
                                                )}
                                                <p className="text-[13px]">
                                                    <a
                                                        href={
                                                            centerArticles[0]
                                                                .url
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {t(
                                                            "newsPage.readFullArticle",
                                                        )}
                                                    </a>
                                                </p>
                                            </div>
                                        </article>
                                    )}

                                    {/* Remaining center articles in grid */}
                                    {centerArticles.length > 1 && (
                                        <div className="news-newspaper-divider-thick my-8" />
                                    )}

                                    {centerArticles.length > 1 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-black">
                                            {centerArticles
                                                .slice(1)
                                                .map((article) => (
                                                    <article
                                                        key={article.id}
                                                        className="group cursor-pointer"
                                                    >
                                                        <a
                                                            href={article.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block"
                                                            aria-label={
                                                                article.title
                                                            }
                                                        >
                                                            <h4 className="news-font-display font-bold text-lg mb-2 group-hover:underline italic">
                                                                {article.title}
                                                            </h4>
                                                        </a>
                                                        {article.description && (
                                                            <p className="text-xs leading-relaxed opacity-80">
                                                                {article.description.substring(
                                                                    0,
                                                                    120,
                                                                )}
                                                                ...
                                                            </p>
                                                        )}
                                                        <div className="mt-3 flex items-center justify-between gap-2 text-[9px] news-font-mono uppercase text-gray-500">
                                                            <span className="min-w-0">
                                                                {article.source}{" "}
                                                                •{" "}
                                                                {article.relativeTime ||
                                                                    formatTimeAgo(
                                                                        article.publishedAt,
                                                                    )}
                                                            </span>
                                                            <span className="flex items-center gap-2 shrink-0">
                                                                <NewsPageAiSummaryTooltip
                                                                    article={
                                                                        article
                                                                    }
                                                                />
                                                                <a
                                                                    href={
                                                                        article.url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="hover:text-black"
                                                                >
                                                                    {t(
                                                                        "newsPage.readMore",
                                                                    )}
                                                                </a>
                                                            </span>
                                                        </div>
                                                    </article>
                                                ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Pagination section */}
                            <div className="flex justify-between items-center py-4">
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    disabled={
                                        isInitialNewsLoading ||
                                        currentPage === 0
                                    }
                                    className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                                        isInitialNewsLoading ||
                                        currentPage === 0
                                            ? "opacity-50 cursor-not-allowed"
                                            : "hover:italic"
                                    }`}
                                >
                                    <ChevronLeft size={14} />
                                    {t("newsPage.previous")}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={
                                        isInitialNewsLoading ||
                                        currentPage >= totalPages - 1
                                    }
                                    className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                                        isInitialNewsLoading ||
                                        currentPage >= totalPages - 1
                                            ? "opacity-50 cursor-not-allowed"
                                            : "hover:italic"
                                    }`}
                                >
                                    {t("newsPage.next")}
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </section>

                        <aside className="lg:col-span-3 order-3 flex flex-col gap-8">
                            <div className="news-newspaper-border p-4 bg-black text-white">
                                <h5 className="text-[10px] news-font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Zap
                                        size={12}
                                        className="text-yellow-400"
                                    />
                                    {t("newsPage.flashReport")}
                                </h5>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[9px] uppercase opacity-60">
                                            {t("newsPage.volume24h")}
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
                                            {t("newsPage.btcDominance")}
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
                                            "{t("newsPage.flashQuote")}"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right column articles */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] news-font-mono uppercase tracking-[0.2em] border-b border-black pb-2">
                                    {t("newsPage.trendingNews")}
                                </h4>

                                {isInitialNewsLoading
                                    ? Array.from({
                                          length: RIGHT_SKELETON_COUNT,
                                      }).map((_, idx) => (
                                          <article
                                              key={`right-skeleton-${idx}`}
                                              className="space-y-3 animate-pulse"
                                          >
                                              <div className="flex gap-3">
                                                  <div className="w-28 h-28 border border-black bg-black/10 shrink-0" />
                                                  <div className="flex-1 space-y-2">
                                                      <div className="h-4 w-full bg-black/15" />
                                                      <div className="h-4 w-5/6 bg-black/10" />
                                                      <div className="h-3 w-4/5 bg-black/10" />
                                                  </div>
                                              </div>
                                              <div className="h-3 w-2/3 bg-black/10" />
                                          </article>
                                      ))
                                    : rightArticles.map((article) => (
                                          <article
                                              key={article.id}
                                              className="flex flex-col gap-2 group cursor-pointer hover:opacity-70 transition-opacity"
                                          >
                                              <div className="flex gap-3">
                                                  <a
                                                      href={article.url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="block shrink-0"
                                                      aria-label={article.title}
                                                  >
                                                      <div className="w-28 h-28 grayscale border border-black overflow-hidden bg-black/5">
                                                          <img
                                                              src={`https://picsum.photos/seed/${article.id}-thumb/200/120`}
                                                              alt={
                                                                  article.title
                                                              }
                                                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                              referrerPolicy="no-referrer"
                                                          />
                                                      </div>
                                                  </a>
                                                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                      <a
                                                          href={article.url}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="block"
                                                          aria-label={
                                                              article.title
                                                          }
                                                      >
                                                          <h5 className="text-sm font-bold leading-tight group-hover:underline line-clamp-3">
                                                              {article.title}
                                                          </h5>
                                                      </a>
                                                      {article.description && (
                                                          <p className="text-[10px] leading-relaxed opacity-70 line-clamp-2">
                                                              {
                                                                  article.description
                                                              }
                                                          </p>
                                                      )}
                                                  </div>
                                              </div>
                                              <div className="flex items-center justify-between gap-2 text-[9px] news-font-mono text-gray-600">
                                                  <span className="min-w-0 truncate">
                                                      {article.source} •{" "}
                                                      {article.relativeTime}
                                                  </span>
                                                  <span className="flex items-center gap-2 shrink-0">
                                                      <NewsPageAiSummaryTooltip
                                                          article={article}
                                                      />
                                                      <a
                                                          href={article.url}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="text-[10px] text-blue-600 hover:underline font-medium"
                                                      >
                                                          {t(
                                                              "newsPage.readMore",
                                                          )}
                                                      </a>
                                                  </span>
                                              </div>
                                          </article>
                                      ))}
                            </div>

                            <div className="news-newspaper-divider-thick pt-6">
                                <h4 className="news-font-display font-bold text-xl mb-2">
                                    {t("newsPage.subscribeTitle")}
                                </h4>
                                <p className="text-[10px] news-font-mono uppercase text-gray-500 mb-4">
                                    {t("newsPage.subscribeHint")}
                                </p>
                                <div className="space-y-3">
                                    <input
                                        type="email"
                                        placeholder={t("newsPage.emailAddress")}
                                        className="w-full bg-transparent border-b border-black py-2 text-sm focus:outline-none focus:border-b-2 placeholder:text-black/30"
                                    />
                                    <button className="w-full bg-black text-white py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-colors">
                                        {t("newsPage.signMeUp")}
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
                                {t("newsPage.footerTagline")}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:col-span-2">
                            <div className="space-y-2">
                                <h5 className="text-[10px] font-bold uppercase tracking-widest mb-4">
                                    {t("newsPage.navigate")}
                                </h5>
                                <Link
                                    href="/"
                                    className="block text-xs hover:italic"
                                >
                                    {t("newsPage.dashboard")}
                                </Link>
                                <Link
                                    href="/market"
                                    className="block text-xs hover:italic"
                                >
                                    {t("newsPage.market")}
                                </Link>
                                <Link
                                    href="/heatmap"
                                    className="block text-xs hover:italic"
                                >
                                    {t("newsPage.heatmap")}
                                </Link>
                                <Link
                                    href="/news"
                                    className="block text-xs hover:italic"
                                >
                                    {t("newsPage.news")}
                                </Link>
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-[10px] font-bold uppercase tracking-widest mb-4">
                                    {t("newsPage.support")}
                                </h5>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    {t("newsPage.helpCenter")}
                                </a>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    {t("newsPage.subscriptions")}
                                </a>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    {t("newsPage.giftCards")}
                                </a>
                                <a
                                    href="#"
                                    className="block text-xs hover:italic"
                                >
                                    {t("newsPage.contactUs")}
                                </a>
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <h5 className="text-[10px] font-bold uppercase tracking-widest mb-4">
                                {t("newsPage.followMe")}
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
                        <p>{t("newsPage.copyright")}</p>
                        <div className="flex gap-6">
                            <a href="#">{t("newsPage.privacyPolicy")}</a>
                            <a href="#">{t("newsPage.termsOfService")}</a>
                            <a href="#">{t("newsPage.cookieSettings")}</a>
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
