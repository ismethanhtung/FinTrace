import { useState, useEffect, useCallback, useRef } from "react";
import {
    binanceService,
    INTERVAL_MAP,
    OhlcvPoint,
    MarketType,
} from "../services/binanceService";
import { format } from "date-fns";
import {
    normalizeKlineStreamEvent,
    subscribeSharedStream,
    type KlineStreamEvent,
    type MarketStreamStatus,
} from "../services/marketStreamService";
import { useUniverse } from "../context/UniverseContext";
import { createMockStockChart } from "../lib/mockStockData";

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
const INTERVAL_MS: Record<ChartInterval, number> = {
    "1m": 60_000,
    "5m": 5 * 60_000,
    "15m": 15 * 60_000,
    "1H": 60 * 60_000,
    "4H": 4 * 60 * 60_000,
    "1D": 24 * 60 * 60_000,
    "1W": 7 * 24 * 60 * 60_000,
    "1M": 30 * 24 * 60 * 60_000,
};

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
/**
 * @param symbol - Trading pair symbol (e.g. "BTCUSDT")
 * @param marketType - Which market to fetch klines from. Futures uses fapi; spot/margin use api.
 */
export const useChartData = (symbol: string, marketType: MarketType = 'spot') => {
    const { universe } = useUniverse();
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
    const [connectionStatus, setConnectionStatus] =
        useState<MarketStreamStatus>("connecting");
    const subscriptionRef = useRef<ReturnType<typeof subscribeSharedStream> | null>(
        null,
    );

    const fetchInitial = useCallback(
        async (sym: string, intv: ChartInterval) => {
            try {
                setIsLoading(true);
                if (universe === "stock") {
                    const points = createMockStockChart(
                        sym,
                        INTERVAL_MS[intv],
                        INITIAL_LIMIT,
                    );
                    const mapped = points.map((p) => ({
                        ...p,
                        time: formatTime(p.timestamp, intv),
                    }));
                    const enriched = enrich(mapped);
                    allDataRef.current = enriched;
                    setAllData(enriched);
                    setError(null);
                    setConnectionStatus("connected");
                    return;
                }
                const getKlines = marketType === 'futures'
                    ? binanceService.getFuturesKlines.bind(binanceService)
                    : binanceService.getKlines.bind(binanceService);
                const raw = await getKlines(sym, intv, INITIAL_LIMIT);
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
                if (universe === "stock") {
                    setConnectionStatus("error");
                }
            } finally {
                setIsLoading(false);
            }
        },
        [marketType, universe],
    );

    const fetchHistory = useCallback(async () => {
        if (isFetchingHistory) return;
        if (universe === "stock") return;
        const oldest = allDataRef.current[0];
        if (!oldest) return;
        try {
            setIsFetchingHistory(true);
            const getKlines = marketType === 'futures'
                ? binanceService.getFuturesKlines.bind(binanceService)
                : binanceService.getKlines.bind(binanceService);
            const raw = await getKlines(
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
    }, [symbol, interval, isFetchingHistory, marketType, universe]);

    useEffect(() => {
        fetchInitial(symbol, interval);
        if (universe === "stock") {
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
            setConnectionStatus("connected");
            return;
        }
        const streamInterval = INTERVAL_MAP[interval] ?? interval;
        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = subscribeSharedStream<KlineStreamEvent>({
            key: `kline:${marketType}:${symbol}:${interval}`,
            url:
                marketType === "futures"
                    ? `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${streamInterval}`
                    : `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${streamInterval}`,
            parser: (raw) => (raw && raw.e === "kline" ? raw : null),
            onMessage: (raw) => {
                const point = normalizeKlineStreamEvent(raw);
                if (!point) return;
                const nextPoint: OhlcvPoint = {
                    ...point,
                    time: formatTime(point.timestamp, interval),
                };
                setAllData((prev) => {
                    const copy = [...prev];
                    const idx = copy.findIndex(
                        (p) => p.timestamp === nextPoint.timestamp,
                    );
                    if (idx >= 0) {
                        copy[idx] = nextPoint;
                    } else {
                        copy.push(nextPoint);
                        copy.sort((a, b) => a.timestamp - b.timestamp);
                    }
                    const enriched = enrich(copy);
                    allDataRef.current = enriched;
                    return enriched;
                });
            },
            onStatus: setConnectionStatus,
        });

        return () => {
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
        };
    }, [symbol, interval, marketType, fetchInitial, universe]);

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
        connectionStatus,
    };
};
