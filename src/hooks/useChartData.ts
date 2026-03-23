import { useState, useEffect, useCallback, useRef } from 'react';
import { binanceService, OhlcvPoint, INTERVAL_MAP, INTERVAL_LIMIT } from '../services/binanceService';
import { format } from 'date-fns';

export type ChartType = 'candlestick' | 'area';
export type Indicator = 'MA7' | 'MA25' | 'EMA99';

export const CHART_INTERVALS = ['1m', '5m', '15m', '1H', '4H', '1D', '1W', '1M'] as const;
export type ChartInterval = typeof CHART_INTERVALS[number];

// ─── Viewport ────────────────────────────────────────────────────────────────
// All loaded candles are kept in `allData`. The chart shows `visibleData`
// which is a sliding window of `windowSize` candles ending at `endIndex`.
const DEFAULT_WINDOW = 80;   // visible candles at start
const MIN_WINDOW    = 20;
const MAX_WINDOW    = 300;
const HISTORY_BATCH  = 120;   // candles fetched per history request

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

/** Enrich a full OhlcvPoint array with indicators */
function enrich(mapped: OhlcvPoint[]): EnrichedPoint[] {
  const ma7   = calcSMA(mapped, 7);
  const ma25  = calcSMA(mapped, 25);
  const ema99 = calcEMA(mapped, 99);
  return mapped.map((p, i) => ({ ...p, MA7: ma7[i], MA25: ma25[i], EMA99: ema99[i] }));
}

export type EnrichedPoint = OhlcvPoint & {
  MA7?: number | null;
  MA25?: number | null;
  EMA99?: number | null;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useChartData = (symbol: string) => {
  const [interval, setInterval] = useState<ChartInterval>('1H');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [activeIndicators, setActiveIndicators] = useState<Set<Indicator>>(new Set(['MA7', 'MA25']));

  // ── Full data buffer (oldest → newest) ──
  const allDataRef = useRef<EnrichedPoint[]>([]);
  const [allData, setAllData] = useState<EnrichedPoint[]>([]);

  // ── Viewport ──
  // endIndex: index in allData of the last visible candle (inclusive)
  // windowSize: how many candles to show
  const endIndexRef = useRef<number>(-1);        // -1 means "track latest"
  const [windowSize, setWindowSize] = useState(DEFAULT_WINDOW);
  const windowSizeRef = useRef(DEFAULT_WINDOW);

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll interval handle
  const pollRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(null);


  // ── Initial fetch ──
  const fetchInitial = useCallback(async (sym: string, intv: ChartInterval) => {
    try {
      setIsLoading(true);
      const raw = await binanceService.getKlines(sym, intv);
      const mapped: OhlcvPoint[] = raw.map((k: any[]) => ({
        ...binanceService.mapKline(k),
        time: formatTime(k[0], intv),
      }));
      const enriched = enrich(mapped);
      allDataRef.current = enriched;
      endIndexRef.current = -1; // track latest
      setAllData(enriched);
      setError(null);
    } catch (err) {
      console.error('[useChartData] Failed to fetch klines:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Poll: append latest candle without resetting viewport ──
  const fetchLatest = useCallback(async (sym: string, intv: ChartInterval) => {
    try {
      const raw = await binanceService.getKlines(sym, intv, 2); // just last 2 candles
      const mapped: OhlcvPoint[] = raw.map((k: any[]) => ({
        ...binanceService.mapKline(k),
        time: formatTime(k[0], intv),
      }));
      setAllData(prev => {
        const copy = [...prev];
        mapped.forEach(newPoint => {
          // Match by timestamp; replace if exists, append if newer
          const idx = copy.findIndex(p => p.timestamp === newPoint.timestamp);
          if (idx >= 0) {
            copy[idx] = newPoint;
          } else {
            copy.push(newPoint);
          }
        });
        const enriched = enrich(copy);
        allDataRef.current = enriched;
        return enriched;
      });
    } catch {
      // Ignore poll errors silently
    }
  }, []);

  // ── Fetch older history (prepend) ──
  const fetchHistory = useCallback(async () => {
    if (isFetchingHistory) return;
    const oldest = allDataRef.current[0];
    if (!oldest) return;
    try {
      setIsFetchingHistory(true);
      const raw = await binanceService.getKlines(symbol, interval, HISTORY_BATCH, oldest.timestamp - 1);
      if (raw.length === 0) return;
      const mapped: OhlcvPoint[] = raw.map((k: any[]) => ({
        ...binanceService.mapKline(k),
        time: formatTime(k[0], interval),
      }));
      setAllData(prev => {
        // Dedupe by timestamp then re-enrich
        const existing = new Set(prev.map(p => p.timestamp));
        const newOnes = mapped.filter(p => !existing.has(p.timestamp));
        if (!newOnes.length) return prev;
        const merged = [...newOnes, ...prev];
        merged.sort((a, b) => a.timestamp - b.timestamp);
        const enriched = enrich(merged);
        allDataRef.current = enriched;
        // Shift endIndex to compensate for prepended items
        endIndexRef.current = endIndexRef.current + newOnes.length;
        return enriched;
      });
    } catch (err) {
      console.error('[useChartData] Failed to fetch history:', err);
    } finally {
      setIsFetchingHistory(false);
    }
  }, [symbol, interval, isFetchingHistory]);

  // ── Re-fetch when symbol or interval changes ──
  useEffect(() => {
    endIndexRef.current = -1;
    setWindowSize(DEFAULT_WINDOW);
    windowSizeRef.current = DEFAULT_WINDOW;
    fetchInitial(symbol, interval);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = globalThis.setInterval(() => fetchLatest(symbol, interval), 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [symbol, interval, fetchInitial, fetchLatest]);

  // ── Derived visible slice ──
  const visibleData: EnrichedPoint[] = (() => {
    if (!allData.length) return [];
    const len = allData.length;
    const wSize = Math.min(windowSizeRef.current, len);
    const endIdx = endIndexRef.current < 0 ? len - 1 : Math.min(endIndexRef.current, len - 1);
    const startIdx = Math.max(0, endIdx - wSize + 1);
    return allData.slice(startIdx, endIdx + 1);
  })();

  // ── Pan by delta candles ──
  const panBy = useCallback((deltaCandleCount: number) => {
    const len = allDataRef.current.length;
    if (!len) return;
    const wSize = windowSizeRef.current;

    if (endIndexRef.current < 0) {
      // Was tracking latest — pin it first
      endIndexRef.current = len - 1;
    }

    const newEnd = endIndexRef.current - deltaCandleCount; // negative delta = pan left (older)
    const minEnd = wSize - 1;
    const maxEnd = len - 1;

    if (newEnd < minEnd) {
      // Need more history
      endIndexRef.current = minEnd;
      fetchHistory();
    } else {
      endIndexRef.current = Math.min(maxEnd, newEnd);
      if (newEnd >= maxEnd) {
        // Back to latest
        endIndexRef.current = -1;
      }
    }

    // Force re-render
    setAllData(d => [...d]);
  }, [fetchHistory]);

  // ── Zoom: change windowSize ──
  const zoomBy = useCallback((delta: number) => {
    const current = windowSizeRef.current;
    const next = Math.min(MAX_WINDOW, Math.max(MIN_WINDOW, current + delta));
    windowSizeRef.current = next;
    setWindowSize(next);
    setAllData(d => [...d]); // force re-render
  }, []);

  const toggleIndicator = useCallback((ind: Indicator) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(ind)) next.delete(ind);
      else next.add(ind);
      return next;
    });
  }, []);

  return {
    data: visibleData,
    isLoading,
    isFetchingHistory,
    error,
    interval,
    setInterval,
    chartType,
    setChartType,
    activeIndicators,
    toggleIndicator,
    panBy,
    zoomBy,
    /** true when viewing a window that does NOT include the latest candle */
    isPanned: endIndexRef.current >= 0 && endIndexRef.current < allDataRef.current.length - 1,
    /** Jump back to latest */
    goToLatest: () => {
      endIndexRef.current = -1;
      setAllData(d => [...d]);
    },
    refetch: () => fetchInitial(symbol, interval),
  };
};
