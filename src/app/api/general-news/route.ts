/**
 * GET /api/general-news
 *
 * Fetches ~20 general crypto news articles from Google News RSS.
 * Results are cached server-side for 30 minutes to avoid rate limits.
 *
 * Returns NewsArticle[] sorted by most recent first.
 */

import { NextResponse } from "next/server";
import Parser from "rss-parser";

export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeneralNewsArticle = {
    id: string;
    title: string;
    url: string;
    source: string;
    publishedAt: string; // ISO string
    relativeTime: string; // "2h ago"
    description?: string; // Content summary
};

// ─── In-memory cache (server process lifetime) ───────────────────────────────

type CacheEntry = {
    articles: GeneralNewsArticle[];
    fetchedAt: number;
};

let _cache: CacheEntry | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

const RSS_QUERIES = [
    "cryptocurrency",
    "bitcoin ethereum market",
    "crypto news blockchain",
    "digital assets trading",
];

async function fetchNewsArticles(): Promise<GeneralNewsArticle[]> {
    const parser = new Parser();

    // Use random query to get varied news
    const query = RSS_QUERIES[Math.floor(Math.random() * RSS_QUERIES.length)];
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

    try {
        const feed = await parser.parseURL(rssUrl);

        const articles = feed.items.slice(0, 20).map((item, index) => {
            const rawDesc =
                item.contentSnippet || item.content || item.summary || "";
            const cleanDesc = rawDesc
                .replace(/(<([^>]+)>)/gi, "")
                .substring(0, 500);
            const cleanTitle = (item.title || "Crypto News")
                .replace(/ - [^-]+$/, "")
                .trim();
            const source =
                (item as any).source?.title || item.creator || feed.title || "News";

            return {
                id: item.guid || `rss-${index}`,
                title: cleanTitle,
                url: item.link || "",
                source: String(source).split(" ")[0],
                publishedAt:
                    item.isoDate || item.pubDate || new Date().toISOString(),
                relativeTime: relativeTime(
                    item.isoDate || item.pubDate || new Date().toISOString(),
                ),
                description: cleanDesc,
            };
        });

        // Sort by most recent first
        return articles.sort(
            (a, b) =>
                new Date(b.publishedAt).getTime() -
                new Date(a.publishedAt).getTime(),
        );
    } catch (error) {
        console.error("[general-news] Error fetching RSS:", error);
        throw error;
    }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "1";

    // Serve from cache if fresh
    if (
        !forceRefresh &&
        _cache &&
        Date.now() - _cache.fetchedAt < CACHE_TTL_MS
    ) {
        return NextResponse.json(
            {
                articles: _cache.articles,
                cachedAt: new Date(_cache.fetchedAt).toISOString(),
                cacheValid: true,
            },
            {
                headers: {
                    "Cache-Control":
                        "public, s-maxage=1800, stale-while-revalidate=300",
                },
            },
        );
    }

    try {
        const articles = await fetchNewsArticles();
        _cache = { articles, fetchedAt: Date.now() };

        return NextResponse.json(
            {
                articles,
                cachedAt: new Date(_cache.fetchedAt).toISOString(),
                cacheValid: true,
            },
            {
                headers: {
                    "Cache-Control":
                        "public, s-maxage=1800, stale-while-revalidate=300",
                },
            },
        );
    } catch (error) {
        console.error("[general-news] Error:", error);

        // If we have stale cache, serve it rather than fail
        if (_cache) {
            return NextResponse.json(
                {
                    articles: _cache.articles,
                    cachedAt: new Date(_cache.fetchedAt).toISOString(),
                    cacheValid: false,
                    warning: "Stale cache served due to fetch error",
                },
                { status: 200 },
            );
        }

        return NextResponse.json(
            { error: "Failed to fetch news", details: String(error) },
            { status: 500 },
        );
    }
}
