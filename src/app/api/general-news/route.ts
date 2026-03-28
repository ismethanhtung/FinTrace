/**
 * GET /api/general-news
 *
 * Fetches up to ~90 general crypto news articles from Google News RSS.
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

    try {
        const feedResults = await Promise.allSettled(
            RSS_QUERIES.map(async (query) => {
                const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
                return parser.parseURL(rssUrl);
            }),
        );
        const feeds = feedResults
            .filter(
                (
                    result,
                ): result is PromiseFulfilledResult<Awaited<ReturnType<Parser["parseURL"]>>> =>
                    result.status === "fulfilled",
            )
            .map((result) => result.value);
        if (feeds.length === 0) {
            throw new Error("All RSS sources failed");
        }

        const deduped = new Map<string, GeneralNewsArticle>();
        let globalIndex = 0;

        for (const feed of feeds) {
            for (const item of feed.items.slice(0, 40)) {
                const rawDesc =
                    item.contentSnippet || item.content || item.summary || "";
                const cleanDesc = rawDesc
                    .replace(/(<([^>]+)>)/gi, "")
                    .trim()
                    .substring(0, 500);
                const cleanTitle = (item.title || "Crypto News")
                    .replace(/ - [^-]+$/, "")
                    .trim();
                const source =
                    (item as any).source?.title ||
                    item.creator ||
                    feed.title ||
                    "News";
                const publishedAt =
                    item.isoDate || item.pubDate || new Date().toISOString();
                const url = item.link || "";

                const dedupeKey =
                    (url || cleanTitle).toLowerCase().replace(/\s+/g, " ").trim();
                if (!dedupeKey || deduped.has(dedupeKey)) continue;

                deduped.set(dedupeKey, {
                    id: item.guid || `rss-${globalIndex++}`,
                    title: cleanTitle,
                    url,
                    source: String(source).split(" ")[0],
                    publishedAt,
                    relativeTime: relativeTime(publishedAt),
                    description: cleanDesc,
                });
            }
        }

        const articles = [...deduped.values()];

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
    const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(limitParam)
        ? Math.min(Math.max(limitParam, 12), 120)
        : 90;

    // Serve from cache if fresh
    if (
        !forceRefresh &&
        _cache &&
        Date.now() - _cache.fetchedAt < CACHE_TTL_MS
    ) {
        return NextResponse.json(
            {
                articles: _cache.articles.slice(0, limit),
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
                articles: articles.slice(0, limit),
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
                    articles: _cache.articles.slice(0, limit),
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
