import { useCallback, useEffect, useRef, useState } from 'react';
import { binanceService, BinanceRecentTrade, MarketType } from '../services/binanceService';

export type Transaction = {
  id: number;
  symbol: string; // base symbol (e.g. BTC)
  pair: string; // pair id (e.g. BTCUSDT)
  price: number;
  qty: number;
  quoteQty: number;
  timeMs: number;
  timeLabel: string;
  isBuy: boolean;
  type: 'buy' | 'sell';
};

function mapTrade(t: BinanceRecentTrade, pair: string): Transaction {
  const quoteQty = t.quoteQty
    ? parseFloat(t.quoteQty)
    : parseFloat(t.price) * parseFloat(t.qty);
  const baseSymbol = pair.replace('USDT', '');
  const timeLabel = new Date(t.time).toLocaleTimeString('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // isBuyerMaker=true => buyer placed maker order => taker (buyer) is the seller
  const isBuy = !t.isBuyerMaker;
  return {
    id: t.id,
    symbol: baseSymbol,
    pair,
    price: parseFloat(t.price),
    qty: parseFloat(t.qty),
    quoteQty,
    timeMs: t.time,
    timeLabel,
    isBuy,
    type: isBuy ? 'buy' : 'sell',
  };
}

export type UseTransactionsOptions = {
  symbol: string; // pair id, e.g. BTCUSDT
  marketType: MarketType;
  limit?: number;
  pollingMs?: number | null; // null => manual only
};

/**
 * Fetch recent trades from Binance spot/futures (REST).
 * Default: polling every 2s (lightweight, not websocket).
 */
type FetchMode = 'initial' | 'poll' | 'manual';

export const useTransactions = ({
  symbol,
  marketType,
  limit = 500,
  pollingMs = 2000,
}: UseTransactionsOptions) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchTrades = useCallback(
    async (mode: FetchMode = 'initial') => {
      if (!symbol) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      const isPoll = mode === 'poll';

      try {
        if (mode === 'initial') {
          setIsLoading(true);
          setError(null);
        }
        if (mode === 'manual') {
          setIsRefreshing(true);
        }
        if (!isPoll) {
          setError(null);
        }

        const getTrades =
          marketType === 'futures'
            ? binanceService.getFuturesRecentTrades.bind(binanceService)
            : binanceService.getRecentTrades.bind(binanceService);

        const raw = await getTrades(symbol, limit);

        // Keep newest first for "tape-like" view.
        const next = raw
          .map((t) => mapTrade(t, symbol))
          .sort((a, b) => b.timeMs - a.timeMs);

        if (mountedRef.current) {
          setTransactions(next);
          setError(null);
        }
      } catch (err: unknown) {
        console.error('[useTransactions] Failed to fetch transactions:', err);
        if (mountedRef.current) {
          const msg =
            err instanceof Error ? err.message : 'Failed to fetch transactions';
          setError(msg);
          // Chỉ xóa list khi load lần đầu / refresh tay — poll lỗi giữ dữ liệu cũ (giống UX live tape).
          if (mode === 'initial' || mode === 'manual') {
            setTransactions([]);
          }
        }
      } finally {
        inFlightRef.current = false;
        if (mountedRef.current) {
          if (mode === 'initial') setIsLoading(false);
          if (mode === 'manual') setIsRefreshing(false);
        }
      }
    },
    [marketType, symbol, limit],
  );

  useEffect(() => {
    mountedRef.current = true;

    fetchTrades('initial');

    if (pollingMs === null) {
      return () => {
        mountedRef.current = false;
      };
    }
    const timer = setInterval(() => {
      fetchTrades('poll');
    }, pollingMs);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [fetchTrades, pollingMs]);

  return {
    transactions,
    isLoading,
    isRefreshing,
    error,
    refetch: () => fetchTrades('manual'),
  };
};
