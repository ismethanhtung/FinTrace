import type { AssetUniverse } from "../lib/marketUniverse";

// ─── Types ────────────────────────────────────────────────────────────────────
export type NewsItem = {
    id: string;
    title: string;
    url: string;
    source: string;
    publishedAt: string; // ISO string
    relativeTime: string; // "2h ago"
    description?: string; // Content summary
    sentiment?: "positive" | "negative" | "neutral";
    currencies?: string[];
    imageUrl?: string;
};

// ─── Time helpers ─────────────────────────────────────────────────────────────
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

// ─── Free RSS Proxy Service ──────────────────────────────────────────────────
export const newsService = {
    /**
     * Fetch real latest news via the local Next.js API proxy (`/api/news`).
     * No API key required.
     */
    async getNews(
        symbol: string,
        _authToken?: string,
        limit = 10,
        universe: AssetUniverse = "coin",
    ): Promise<NewsItem[]> {
        const safeSymbol = String(symbol || "").trim().toUpperCase();
        if (!safeSymbol) return [];
        const res = await fetch(
            `/api/news?symbol=${encodeURIComponent(safeSymbol)}&universe=${encodeURIComponent(universe)}`,
        );
        if (!res.ok) throw new Error(`News API Error: ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];

        return items.slice(0, limit).map((item: any) => ({
            id: String(item.id),
            title: item.title,
            url: item.url,
            source: item.source || "News",
            publishedAt: item.publishedAt,
            relativeTime: relativeTime(item.publishedAt),
            description: item.description,
            sentiment: "neutral", // Hard to extract from basic RSS
            currencies: [safeSymbol.replace("USDT", "")],
        }));
    },
};
