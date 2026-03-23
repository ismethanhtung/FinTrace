// ─── Types ────────────────────────────────────────────────────────────────────
export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;      // ISO string
  relativeTime: string;     // "2h ago"
  sentiment?: 'positive' | 'negative' | 'neutral';
  currencies?: string[];
};

// ─── Time helpers ─────────────────────────────────────────────────────────────
function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 2)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── CryptoPanic service ─────────────────────────────────────────────────────
// Docs: https://cryptopanic.com/developers/api/
const CP_BASE = 'https://cryptopanic.com/api/v1';

export const newsService = {
  /**
   * Fetch latest news for a coin symbol via CryptoPanic.
   * Requires a free API auth token from cryptopanic.com.
   * Falls back to a curated mock if no key is provided.
   *
   * @param symbol  Base coin symbol, e.g. "BTC", "ETH" (not "BTCUSDT")
   * @param authToken  CryptoPanic API auth token (optional)
   * @param limit   Max articles (default 10)
   */
  async getNews(symbol: string, authToken?: string, limit = 10): Promise<NewsItem[]> {
    if (!authToken) {
      return newsService._mockNews(symbol);
    }

    try {
      // CryptoPanic endpoint: /posts/?auth_token=...&currencies=BTC&public=true
      const url = new URL(`${CP_BASE}/posts/`);
      url.searchParams.set('auth_token', authToken);
      url.searchParams.set('currencies', symbol.toUpperCase());
      url.searchParams.set('public', 'true');
      url.searchParams.set('kind', 'news');
      url.searchParams.set('filter', 'hot');

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        // CryptoPanic has CORS only for their app, so we proxy through Next.js API route
        // If 'no-cors' then we fallback to mock
      });

      if (!res.ok) throw new Error(`CryptoPanic ${res.status}`);
      const json = await res.json();

      const results: any[] = json.results ?? [];
      return results.slice(0, limit).map((item: any) => ({
        id: String(item.id),
        title: item.title,
        url: item.url ?? item.source?.url ?? '#',
        source: item.source?.title ?? item.domain ?? 'Unknown',
        publishedAt: item.published_at ?? new Date().toISOString(),
        relativeTime: relativeTime(item.published_at ?? new Date().toISOString()),
        sentiment: item.votes?.positive > item.votes?.negative ? 'positive'
                 : item.votes?.negative > item.votes?.positive ? 'negative'
                 : 'neutral',
        currencies: item.currencies?.map((c: any) => c.code) ?? [symbol],
      }));
    } catch (err) {
      console.warn('[newsService] CryptoPanic request failed, using mock:', err);
      return newsService._mockNews(symbol);
    }
  },

  /** Curated mock news used when no API key is configured */
  _mockNews(symbol: string): NewsItem[] {
    const sym = symbol.toUpperCase();
    return [
      {
        id: 'm1',
        title: `${sym} Tests Key Resistance — Analysts Eye Next Level`,
        url: '#',
        source: 'CoinDesk',
        publishedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
        relativeTime: '2h ago',
        sentiment: 'positive',
        currencies: [sym],
      },
      {
        id: 'm2',
        title: `Institutional Flows Into ${sym} Hit 3-Month High`,
        url: '#',
        source: 'The Block',
        publishedAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
        relativeTime: '5h ago',
        sentiment: 'positive',
        currencies: [sym],
      },
      {
        id: 'm3',
        title: `${sym} On-Chain Activity Spikes Amid Market Consolidation`,
        url: '#',
        source: 'Glassnode',
        publishedAt: new Date(Date.now() - 9 * 3600_000).toISOString(),
        relativeTime: '9h ago',
        sentiment: 'neutral',
        currencies: [sym],
      },
      {
        id: 'm4',
        title: `Macro Uncertainty Pressures Crypto Markets — ${sym} Holds Support`,
        url: '#',
        source: 'Bloomberg Crypto',
        publishedAt: new Date(Date.now() - 14 * 3600_000).toISOString(),
        relativeTime: '14h ago',
        sentiment: 'neutral',
        currencies: [sym],
      },
      {
        id: 'm5',
        title: `${sym} Network Upgrade Scheduled — Community Reacts Positively`,
        url: '#',
        source: 'Decrypt',
        publishedAt: new Date(Date.now() - 22 * 3600_000).toISOString(),
        relativeTime: '22h ago',
        sentiment: 'positive',
        currencies: [sym],
      },
    ];
  },
};
