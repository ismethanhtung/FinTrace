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
    ): Promise<NewsItem[]> {
        const safeSymbol = String(symbol || "").trim().toUpperCase();
        if (!safeSymbol) return [];
        try {
            const res = await fetch(
                `/api/news?symbol=${encodeURIComponent(safeSymbol)}`,
            );
            if (!res.ok) throw new Error(`News API Error: ${res.status}`);
            const data = await res.json();

            if (!data.items || data.items.length === 0) {
                return newsService._mockNews(safeSymbol);
            }

            return data.items.slice(0, limit).map((item: any) => ({
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
        } catch (err) {
            console.warn(
                "[newsService] Real news request failed, using mock fallback:",
                err,
            );
            return newsService._mockNews(safeSymbol);
        }
    },

    /** Curated mock news used when network fails */
    _mockNews(symbol: string): NewsItem[] {
        const sym = symbol.toUpperCase().replace("USDT", "");
        return [
            {
                id: "m1",
                title: `${sym} Tests Key Resistance — Analysts Eye Next Level`,
                url: "#",
                source: "CoinDesk",
                publishedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
                relativeTime: "2h ago",
                sentiment: "positive",
                currencies: [sym],
            },
            {
                id: "m2",
                title: `Institutional Flows Into ${sym} Hit 3-Month High`,
                url: "#",
                source: "The Block",
                publishedAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
                relativeTime: "5h ago",
                sentiment: "positive",
                currencies: [sym],
            },
            {
                id: "m3",
                title: `${sym} On-Chain Activity Spikes Amid Market Consolidation`,
                url: "#",
                source: "Glassnode",
                publishedAt: new Date(Date.now() - 9 * 3600_000).toISOString(),
                relativeTime: "9h ago",
                sentiment: "neutral",
                currencies: [sym],
            },
        ];
    },
};
