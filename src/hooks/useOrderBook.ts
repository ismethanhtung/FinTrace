import { useState, useEffect, useCallback } from 'react';
import { binanceService } from '../services/binanceService';

export type OrderBookEntry = {
  price: number;
  quantity: number;
  total: number;
  /** 0–1, cumulative depth as fraction of max total — for depth bar width */
  depth: number;
};

export type OrderBookData = {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
};

/**
 * Group raw Binance order book entries by a price precision level.
 * Bids (buyers) floor the price; asks (sellers) ceil it.
 */
function groupEntries(
  raw: string[][],
  grouping: number,
  side: 'bid' | 'ask',
  limitBuckets = 1000,
): { price: number; quantity: number }[] {
  const decimals = grouping < 1 ? (grouping.toString().split('.')[1]?.length ?? 0) : 0;

  const roundToDecimals = (value: number, d: number) => {
    const factor = 10 ** d;
    return Math.round(value * factor) / factor;
  };

  const map = new Map<number, number>();
  for (const [priceStr, qtyStr] of raw) {
    const price = parseFloat(priceStr);
    const qty = parseFloat(qtyStr);
    const keyRaw =
      side === 'bid'
        ? Math.floor(price / grouping) * grouping
        : Math.ceil(price / grouping) * grouping;

    const key = roundToDecimals(keyRaw, decimals);
    map.set(key, (map.get(key) ?? 0) + qty);
  }
  return [...map.entries()]
    .map(([price, quantity]) => ({ price, quantity }))
    .sort((a, b) => (side === 'bid' ? b.price - a.price : a.price - b.price))
    .slice(0, limitBuckets);
}

export const GROUPING_OPTIONS = [0.01, 0.1, 1, 10, 50, 100, 1000] as const;
export type Grouping = typeof GROUPING_OPTIONS[number];

/**
 * Suggest the best default grouping for a given price.
 * Aims for ~4 significant grouping levels visible.
 */
export function suggestGrouping(price: number): Grouping {
  if (price < 0.01) return 0.01;
  if (price < 0.5) return 0.01;
  if (price < 5) return 0.1;
  if (price < 50) return 0.1;
  if (price < 500) return 1;
  if (price < 5000) return 10;
  if (price < 50000) return 50;
  return 100;
}

export const useOrderBook = (symbol: string, grouping: Grouping) => {
  const [data, setData] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepth = useCallback(async () => {
    try {
      const raw = await binanceService.getDepth(symbol, 1000);

      const rawBids = groupEntries(raw.bids, grouping, 'bid');
      const rawAsks = groupEntries(raw.asks, grouping, 'ask');

      // Running cumulative totals
      let bidRunning = 0;
      const bidsWithTotal = rawBids.map(b => {
        bidRunning += b.quantity;
        return { ...b, total: bidRunning };
      });

      let askRunning = 0;
      const asksWithTotal = rawAsks.map(a => {
        askRunning += a.quantity;
        return { ...a, total: askRunning };
      });

      const maxTotal = Math.max(bidRunning, askRunning);

      const bids: OrderBookEntry[] = bidsWithTotal.map(b => ({
        ...b,
        depth: maxTotal > 0 ? b.total / maxTotal : 0,
      }));
      const asks: OrderBookEntry[] = asksWithTotal.map(a => ({
        ...a,
        depth: maxTotal > 0 ? a.total / maxTotal : 0,
      }));

      const bestBid = bids[0]?.price ?? 0;
      const bestAsk = asks[0]?.price ?? 0;
      const spread = bestAsk - bestBid;
      const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;
      const midPrice = (bestBid + bestAsk) / 2;

      setData({ bids, asks, spread, spreadPercent, midPrice });
      setError(null);
    } catch (err) {
      console.error('[useOrderBook] Failed to fetch depth:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order book');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, grouping]);

  useEffect(() => {
    fetchDepth();
    const timer = setInterval(fetchDepth, 2000);
    return () => clearInterval(timer);
  }, [fetchDepth]);

  return { data, isLoading, error };
};
