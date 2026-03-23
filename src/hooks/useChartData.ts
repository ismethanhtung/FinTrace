import { useState, useEffect, useCallback, useRef } from "react";
import {
    binanceService,
    OhlcvPoint,
} from "../services/binanceService";
import { format } from "date-fns";

export type ChartType = "candlestick" | "area";
export type Indicator = "MA7" | "MA25" | "EMA99";

export const CHART_INTERVALS = [
    "1m",
    "5m",
    "15m",
    "1H",
    "4H",
    "1D",
    "1W",
    "1M",
] as const;
export type ChartInterval = (typeof CHART_INTERVALS)[number];

const INITIAL_LIMIT = 300;
const HISTORY_BATCH = 200;

export type EnrichedPoint = OhlcvPoint & {
    MA7?: number | null;
    MA25?: number | null;
    EMA99?: number | null;
};

function formatTime(ts: number, interval: ChartInterval): string {
    const d = new Date(ts);
    switch (interval) {
        case "1m":
        case "5m":
        case "15m":
            return format(d, "HH:mm");
        case "1H":
        case "4H":
            return format(d, "dd/MM HH:mm");
        case "1D":
            return format(d, "dd MMM");
        case "1W":
        case "1M":
            return format(d, "MMM yy");
        default:
            return format(d, "dd/MM");
    }
}

function calcSMA(data: OhlcvPoint[], period: number): (number | null)[] {
    return data.map((_, i) => {
        if (i < period - 1) return null;
        const slice = data.slice(i - period + 1, i + 1);
        return slice.reduce((s, p) => s + p.close, 0) / period;
    });
}

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
            ema =
                data.slice(0, period).reduce((s, p) => s + p.close, 0) / period;
        } else {
            ema = point.close * k + (ema as number) * (1 - k);
        }
        result.push(ema);
    });

    return result;
}

function enrich(mapped: OhlcvPoint[]): EnrichedPoint[] {
    const ma7 = calcSMA(mapped, 7);
    const ma25 = calcSMA(mapped, 25);
    const ema99 = calcEMA(mapped, 99);
    return mapped.map((p, i) => ({
        ...p,
        MA7: ma7[i],
        MA25: ma25[i],
        EMA99: ema99[i],
    }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useChartData = (symbol: string) => {
    const [interval, setInterval] = useState<ChartInterval>("1H");
    const [chartType, setChartType] = useState<ChartType>("candlestick");
    const [activeIndicators, setActiveIndicators] = useState<Set<Indicator>>(
        new Set(["MA7", "MA25"]),
    );

    const allDataRef = useRef<EnrichedPoint[]>([]);
    const [allData, setAllData] = useState<EnrichedPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(
        null,
    );

    const fetchInitial = useCallback(
        async (sym: string, intv: ChartInterval) => {
            try {
                setIsLoading(true);
                const raw = await binanceService.getKlines(
                    sym,
                    intv,
                    INITIAL_LIMIT,
                );
                const mapped: OhlcvPoint[] = raw.map((k: any[]) => ({
                    ...binanceService.mapKline(k),
                    time: formatTime(k[0], intv),
                }));
                const enriched = enrich(mapped);
                allDataRef.current = enriched;
                setAllData(enriched);
                setError(null);
            } catch (err) {
                console.error("[useChartData] Failed to fetch klines:", err);
                setError(
                    err instanceof Error ? err.message : "Failed to load chart",
                );
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    const fetchLatest = useCallback(
        async (sym: string, intv: ChartInterval) => {
            try {
                const raw = await binanceService.getKlines(sym, intv, 2);
                const mapped: OhlcvPoint[] = raw.map((k: any[]) => ({
                    ...binanceService.mapKline(k),
                    time: formatTime(k[0], intv),
                }));
                setAllData((prev) => {
                    const copy = [...prev];
                    mapped.forEach((newPoint) => {
                        const idx = copy.findIndex(
                            (p) => p.timestamp === newPoint.timestamp,
                        );
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
        },
        [],
    );

    const fetchHistory = useCallback(async () => {
        if (isFetchingHistory) return;
        const oldest = allDataRef.current[0];
        if (!oldest) return;
        try {
            setIsFetchingHistory(true);
            const raw = await binanceService.getKlines(
                symbol,
                interval,
                HISTORY_BATCH,
                oldest.timestamp - 1,
            );
            if (raw.length === 0) return;
            const mapped: OhlcvPoint[] = raw.map((k: any[]) => ({
                ...binanceService.mapKline(k),
                time: formatTime(k[0], interval),
            }));
            setAllData((prev) => {
                const existing = new Set(prev.map((p) => p.timestamp));
                const newOnes = mapped.filter(
                    (p) => !existing.has(p.timestamp),
                );
                if (!newOnes.length) return prev;
                const merged = [...newOnes, ...prev];
                merged.sort((a, b) => a.timestamp - b.timestamp);
                const enriched = enrich(merged);
                allDataRef.current = enriched;
                return enriched;
            });
        } catch (err) {
            console.error("[useChartData] Failed to fetch history:", err);
        } finally {
            setIsFetchingHistory(false);
        }
    }, [symbol, interval, isFetchingHistory]);

    useEffect(() => {
        fetchInitial(symbol, interval);

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = globalThis.setInterval(
            () => fetchLatest(symbol, interval),
            5000,
        );

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [symbol, interval, fetchInitial, fetchLatest]);

    const toggleIndicator = useCallback((ind: Indicator) => {
        setActiveIndicators((prev) => {
            const next = new Set(prev);
            if (next.has(ind)) next.delete(ind);
            else next.add(ind);
            return next;
        });
    }, []);

    return {
        data: allData,
        isLoading,
        isFetchingHistory,
        error,
        interval,
        setInterval,
        chartType,
        setChartType,
        activeIndicators,
        toggleIndicator,
        fetchHistory,
        refetch: () => fetchInitial(symbol, interval),
    };
};
