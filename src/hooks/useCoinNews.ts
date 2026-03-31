import { useState, useEffect, useCallback, useRef } from 'react';
import { newsService, NewsItem } from '../services/newsService';
import { useUniverse } from '../context/UniverseContext';
import { toNewsBaseSymbol } from '../lib/universeSymbol';

interface UseCoinNewsOptions {
  symbol: string;          // e.g. "BTCUSDT" or "BTC"
  refreshIntervalMs?: number;
}

export const useCoinNews = ({
  symbol,
  refreshIntervalMs = 5 * 60_000, // 5 minutes
}: UseCoinNewsOptions) => {
  const { universe, isHydrated = true } = useUniverse();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const safeBaseSymbol = toNewsBaseSymbol(symbol, universe) ?? "";

  const isMounted = useRef(true);

  const fetchNews = useCallback(async () => {
    if (!isHydrated) return;
    if (!safeBaseSymbol) {
      if (!isMounted.current) return;
      setNews([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const items = await newsService.getNews(
        safeBaseSymbol,
        undefined,
        10,
        universe,
      );
      if (!isMounted.current) return;
      setNews(items);
      setLastFetched(new Date());
      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      console.error('[useCoinNews] Failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [isHydrated, safeBaseSymbol, universe]);

  // Fetch on symbol change + set up polling
  useEffect(() => {
    isMounted.current = true;
    if (!isHydrated) {
      setNews([]);
      setError(null);
      setIsLoading(true);
      return () => {
        isMounted.current = false;
      };
    }
    fetchNews();
    const id = setInterval(fetchNews, refreshIntervalMs);
    return () => {
      isMounted.current = false;
      clearInterval(id);
    };
  }, [fetchNews, isHydrated, refreshIntervalMs]);

  return { news, isLoading, error, lastFetched, refetch: fetchNews, baseSymbol: safeBaseSymbol };
};
