import { useState, useEffect, useCallback, useRef } from 'react';
import { newsService, NewsItem } from '../services/newsService';

interface UseCoinNewsOptions {
  symbol: string;          // e.g. "BTCUSDT" or "BTC"
  refreshIntervalMs?: number;
}

export const useCoinNews = ({
  symbol,
  refreshIntervalMs = 5 * 60_000, // 5 minutes
}: UseCoinNewsOptions) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Normalise symbol: "BTCUSDT" → "BTC", "BTC" → "BTC"
  const baseSymbol = symbol.replace(/USDT$/, '').replace(/USD$/, '').toUpperCase();

  const isMounted = useRef(true);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await newsService.getNews(baseSymbol);
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
  }, [baseSymbol]);

  // Fetch on symbol change + set up polling
  useEffect(() => {
    isMounted.current = true;
    fetchNews();
    const id = setInterval(fetchNews, refreshIntervalMs);
    return () => {
      isMounted.current = false;
      clearInterval(id);
    };
  }, [fetchNews, refreshIntervalMs]);

  return { news, isLoading, error, lastFetched, refetch: fetchNews, baseSymbol };
};

