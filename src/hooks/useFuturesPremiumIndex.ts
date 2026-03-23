import { useState, useEffect, useCallback, useRef } from 'react';
import { binanceService, FuturesPremiumIndex, MarketType } from '../services/binanceService';

export type { FuturesPremiumIndex };

/**
 * Polls Binance Futures premium index for a given symbol when in futures mode.
 * Provides mark price, index price, funding rate, and next funding time.
 *
 * Only fetches when `marketType === 'futures'`; returns null otherwise.
 */
export const useFuturesPremiumIndex = (
  symbol: string,
  marketType: MarketType,
) => {
  const [data, setData] = useState<FuturesPremiumIndex | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (marketType !== 'futures') {
      setData(null);
      setError(null);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    try {
      const result = await binanceService.getFuturesPremiumIndex(symbol);
      setData(result);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('[useFuturesPremiumIndex] Failed to fetch premium index:', err);
      setError(err instanceof Error ? err.message : 'Failed to load futures data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, marketType]);

  useEffect(() => {
    fetchData();

    if (marketType !== 'futures') return;

    // Funding rate updates roughly every 8h but mark price updates constantly;
    // poll every 10s for a good balance of freshness vs requests.
    const timer = setInterval(fetchData, 10_000);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetchData, marketType]);

  /** Derived: funding rate as percentage string (e.g. "+0.0100%") */
  const fundingRatePct = data
    ? `${parseFloat(data.lastFundingRate) >= 0 ? '+' : ''}${(parseFloat(data.lastFundingRate) * 100).toFixed(4)}%`
    : null;

  /** Derived: ms until next funding event */
  const msToNextFunding = data ? Math.max(0, data.nextFundingTime - Date.now()) : null;

  return { data, isLoading, error, fundingRatePct, msToNextFunding, refetch: fetchData };
};
