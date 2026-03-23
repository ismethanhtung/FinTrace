import { useState, useEffect, useCallback, useRef } from 'react';
import { binanceService, OhlcvPoint, INTERVAL_MAP } from '../services/binanceService';
import { format } from 'date-fns';

export type ChartType = 'candlestick' | 'area';
export type Indicator = 'MA7' | 'MA25' | 'EMA99';

export const CHART_INTERVALS = ['1m', '5m', '15m', '1H', '4H', '1D', '1W', '1M'] as const;
export type ChartInterval = typeof CHART_INTERVALS[number];

/** Format timestamp based on interval */
function formatTime(ts: number, interval: ChartInterval): string {
  const d = new Date(ts);
  switch (interval) {
    case '1m':
    case '5m':
    case '15m':
      return format(d, 'HH:mm');
    case '1H':
    case '4H':
      return format(d, 'dd/MM HH:mm');
    case '1D':
      return format(d, 'dd MMM');
    case '1W':
    case '1M':
      return format(d, 'MMM yy');
    default:
      return format(d, 'dd/MM');
  }
}

/** Simple Moving Average */
function calcSMA(data: OhlcvPoint[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, p) => s + p.close, 0) / period;
  });
}

/** Exponential Moving Average */
function calcEMA(data: OhlcvPoint[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let ema: number | null = null;

  data.forEach((point, i) => {
    if (i < period - 1) {
      result.push(null);
      return;
    }
    if (i === period - 1) {
      ema = data.slice(0, period).reduce((s, p) => s + p.close, 0) / period;
    } else {
      ema = point.close * k + (ema as number) * (1 - k);
    }
    result.push(ema);
  });

  return result;
}

export type EnrichedPoint = OhlcvPoint & {
  MA7?: number | null;
  MA25?: number | null;
  EMA99?: number | null;
};

export const useChartData = (symbol: string) => {
  const [interval, setInterval] = useState<ChartInterval>('1H');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [activeIndicators, setActiveIndicators] = useState<Set<Indicator>>(new Set(['MA7', 'MA25']));
  const [data, setData] = useState<EnrichedPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(null);

  const fetchData = useCallback(async (sym: string, intv: ChartInterval) => {
    try {
      setIsLoading(true);
      const raw = await binanceService.getKlines(sym, intv);
      const mapped: OhlcvPoint[] = raw.map((k: any[]) => ({
        ...binanceService.mapKline(k),
        time: formatTime(k[0], intv),
      }));

      // Compute indicators
      const ma7 = calcSMA(mapped, 7);
      const ma25 = calcSMA(mapped, 25);
      const ema99 = calcEMA(mapped, 99);

      const enriched: EnrichedPoint[] = mapped.map((p, i) => ({
        ...p,
        MA7: ma7[i],
        MA25: ma25[i],
        EMA99: ema99[i],
      }));

      setData(enriched);
      setError(null);
    } catch (err) {
      console.error('[useChartData] Failed to fetch klines:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch when symbol or interval changes
  useEffect(() => {
    fetchData(symbol, interval);

    // Poll every 5s for real-time updates
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = globalThis.setInterval(() => fetchData(symbol, interval), 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [symbol, interval, fetchData]);

  const toggleIndicator = useCallback((ind: Indicator) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(ind)) next.delete(ind);
      else next.add(ind);
      return next;
    });
  }, []);

  return {
    data,
    isLoading,
    error,
    interval,
    setInterval,
    chartType,
    setChartType,
    activeIndicators,
    toggleIndicator,
    refetch: () => fetchData(symbol, interval),
  };
};
