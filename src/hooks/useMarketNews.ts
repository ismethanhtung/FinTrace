import { useState, useEffect, useCallback, useRef } from 'react';
import type { MarketNewsArticle } from '../app/api/market-news/route';

export type { MarketNewsArticle };

interface UseMarketNewsResult {
  articles: MarketNewsArticle[];
  isLoading: boolean;
  error: string | null;
  cachedAt: string | null;
  refetch: (forceRefresh?: boolean) => void;
}

interface UseMarketNewsOptions {
  userGroqApiKey?: string;
}

const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours, mirrors server cache

export function useMarketNews(options: UseMarketNewsOptions = {}): UseMarketNewsResult {
  const { userGroqApiKey } = options;
  const [articles, setArticles] = useState<MarketNewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchNews = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `/api/market-news${forceRefresh ? '?refresh=1' : ''}`;
      const headers: Record<string, string> = {};
      if (userGroqApiKey?.trim()) {
        headers['x-groq-api-key'] = userGroqApiKey.trim();
      }

      const res = await fetch(url, {
        headers,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!isMounted.current) return;
      setArticles(data.articles ?? []);
      setCachedAt(data.cachedAt ?? null);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load market news');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [userGroqApiKey]);

  useEffect(() => {
    isMounted.current = true;
    fetchNews();
    const interval = setInterval(() => fetchNews(), REFRESH_INTERVAL_MS);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchNews]);

  const refetch = useCallback(
    (forceRefresh = false) => fetchNews(forceRefresh),
    [fetchNews],
  );

  return { articles, isLoading, error, cachedAt, refetch };
}
