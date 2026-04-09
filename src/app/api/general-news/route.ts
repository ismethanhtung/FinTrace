/**
 * GET /api/general-news
 *
 * Fetches up to ~90 general market news articles from Google News RSS.
 * Results are cached server-side for 30 minutes to avoid rate limits.
 *
 * Returns NewsArticle[] sorted by most recent first.
 */

import { NextResponse } from "next/server";
import { normalizeUniverse } from "../../../lib/marketUniverse";
import type { AssetUniverse } from "../../../lib/marketUniverse";
import {
    fetchRssFeed,
    readRssErrorLogFields,
    type ParsedRssFeed,
} from "../../../lib/rss";

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

const _cache: Record<AssetUniverse, CacheEntry | null> = {
    coin: null,
    stock: null,
};
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

const COIN_RSS_QUERIES = [
    "cryptocurrency",
    "bitcoin ethereum market",
    "crypto news blockchain",
    "digital assets trading",
];

const STOCK_RSS_QUERIES = [
    "chứng khoán",
    "thị trường chứng khoán",
    "cổ phiếu",
    "tin tức chứng khoán",
];

function buildRssPlan(universe: AssetUniverse): {
    queries: string[];
    hl: string;
    gl: string;
    ceid: string;
} {
    if (universe === "stock") {
        return {
            queries: STOCK_RSS_QUERIES,
            hl: "vi",
            gl: "VN",
            ceid: "VN:vi",
        };
    }
    return {
        queries: COIN_RSS_QUERIES,
        hl: "en-US",
        gl: "US",
        ceid: "US:en",
    };
}

async function fetchNewsArticles(
    universe: AssetUniverse,
): Promise<GeneralNewsArticle[]> {
    const { queries, hl, gl, ceid } = buildRssPlan(universe);

    try {
        const feedResults = await Promise.allSettled(
            queries.map(async (query) => {
                const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
                return fetchRssFeed(rssUrl);
            }),
        );
        const feeds = feedResults
            .filter(
                (
                    result,
                ): result is PromiseFulfilledResult<ParsedRssFeed> =>
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
        console.error(
            "[general-news] Error fetching RSS:",
            readRssErrorLogFields(error),
        );
        throw error;
    }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "1";
    const universe = normalizeUniverse(searchParams.get("universe"));
    const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(limitParam)
        ? Math.min(Math.max(limitParam, 12), 120)
        : 90;
    const cacheEntry = _cache[universe];

    // Serve from cache if fresh
    if (
        !forceRefresh &&
        cacheEntry &&
        Date.now() - cacheEntry.fetchedAt < CACHE_TTL_MS
    ) {
        return NextResponse.json(
            {
                articles: cacheEntry.articles.slice(0, limit),
                cachedAt: new Date(cacheEntry.fetchedAt).toISOString(),
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
        const articles = await fetchNewsArticles(universe);
        _cache[universe] = { articles, fetchedAt: Date.now() };
        const freshCache = _cache[universe];

        return NextResponse.json(
            {
                articles: articles.slice(0, limit),
                cachedAt: freshCache
                    ? new Date(freshCache.fetchedAt).toISOString()
                    : new Date().toISOString(),
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
        console.error("[general-news] Error:", readRssErrorLogFields(error));

        // If we have stale cache, serve it rather than fail
        if (cacheEntry) {
            return NextResponse.json(
                {
                    articles: cacheEntry.articles.slice(0, limit),
                    cachedAt: new Date(cacheEntry.fetchedAt).toISOString(),
                    cacheValid: false,
                    warning: "Stale cache served due to fetch error",
                },
                { status: 200 },
            );
        }

        return NextResponse.json(
            {
                error: "Failed to fetch news via RSS. Please retry shortly.",
                details: readRssErrorLogFields(error).message,
            },
            { status: 500 },
        );
    }
}
