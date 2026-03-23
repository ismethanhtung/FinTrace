import { useCallback, useEffect, useState } from 'react';
import {
  binanceService,
  BinanceRecentTrade,
  MarketType,
} from '../services/binanceService';

export type RecentTradeItem = {
  id: number;
  price: number;
  qty: number;
  time: number;
  isBuy: boolean;
};

function mapTrade(t: BinanceRecentTrade): RecentTradeItem {
  return {
    id: t.id,
    price: parseFloat(t.price),
    qty: parseFloat(t.qty),
    time: t.time,
    // Binance: isBuyerMaker=true => taker is seller => sell pressure
    isBuy: !t.isBuyerMaker,
  };
}

/**
 * Fetch real recent trades from Binance (spot/futures) with lightweight polling.
 */
export const useRecentTrades = (
  symbol: string,
  marketType: MarketType,
  limit = 80,
) => {
  const [trades, setTrades] = useState<RecentTradeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    try {
      const getTrades = marketType === 'futures'
        ? binanceService.getFuturesRecentTrades.bind(binanceService)
        : binanceService.getRecentTrades.bind(binanceService);
      const raw = await getTrades(symbol, limit);
      // Keep newest first for tape-style view
      const next = raw.map(mapTrade).sort((a, b) => b.time - a.time);
      setTrades(next);
      setError(null);
    } catch (err: unknown) {
      console.error('[useRecentTrades] Failed to fetch recent trades:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recent trades');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, marketType, limit]);

  useEffect(() => {
    setIsLoading(true);
    fetchTrades();
    const timer = setInterval(fetchTrades, 2000);
    return () => clearInterval(timer);
  }, [fetchTrades]);

  return { trades, isLoading, error, refetch: fetchTrades };
};

