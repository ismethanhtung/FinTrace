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
import { stockLambdaService } from "../services/stockLambdaService";

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
const STOCK_RESOLUTION_BY_INTERVAL: Record<ChartInterval, string> = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "1H": "60",
    "4H": "240",
    "1D": "1D",
    "1W": "1W",
    "1M": "1M",
};
const STOCK_DAYS_BY_INTERVAL: Record<ChartInterval, number> = {
    "1m": 21,
    "5m": 45,
    "15m": 180,
    "1H": 1800,
    "4H": 3650,
    "1D": 3650,
    "1W": 3650,
    "1M": 3650,
};
const STOCK_HISTORY_DAYS_BY_INTERVAL: Record<ChartInterval, number> = {
    "1m": 14,
    "5m": 30,
    "15m": 180,
    "1H": 180,
    "4H": 365,
    "1D": 3650,
    "1W": 3650,
    "1M": 3650,
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
export const useChartData = (
    symbol: string,
    marketType: MarketType = "spot",
) => {
    const { universe } = useUniverse();
    const resolvedSymbol =
        universe === "coin" && !symbol.toUpperCase().endsWith("USDT")
            ? "BTCUSDT"
            : symbol;
    const [interval, setInterval] = useState<ChartInterval>(
        universe === "stock" ? "1D" : "1H",
    );
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
    const subscriptionRef = useRef<ReturnType<
        typeof subscribeSharedStream
    > | null>(null);
    const initialFetchSeqRef = useRef(0);

    useEffect(() => {
        setInterval(universe === "stock" ? "1D" : "1H");
    }, [universe]);

    const fetchInitial = useCallback(
        async (sym: string, intv: ChartInterval) => {
            const requestSeq = ++initialFetchSeqRef.current;
            try {
                setIsLoading(true);
                setError(null);
                allDataRef.current = [];
                setAllData([]);
                if (universe === "stock") {
                    if (!stockLambdaService.isConfigured()) {
                        if (requestSeq !== initialFetchSeqRef.current) return;
                        allDataRef.current = [];
                        setAllData([]);
                        setError("Missing NEXT_PUBLIC_STOCK_LAMBDA_URL env");
                        setConnectionStatus("error");
                        return;
                    }
                    const stockSymbol = sym.replace(/-C|-F/gi, "");
                    const startDate = format(
                        new Date(
                            Date.now() -
                                STOCK_DAYS_BY_INTERVAL[intv] *
                                    24 *
                                    60 *
                                    60 *
                                    1000,
                        ),
                        "yyyy-MM-dd",
                    );
                    const livePoints = await stockLambdaService.getStockChart(
                        stockSymbol,
                        STOCK_RESOLUTION_BY_INTERVAL[intv],
                        STOCK_DAYS_BY_INTERVAL[intv],
                        { startDate },
                    );
                    if (requestSeq !== initialFetchSeqRef.current) return;
                    const mapped = livePoints.map((p) => ({
                        ...p,
                        time: formatTime(p.timestamp, intv),
                    }));
                    const enriched = enrich(mapped);
                    allDataRef.current = enriched;
                    setAllData(enriched);
                    if (enriched.length > 0) {
                        setError(null);
                        setConnectionStatus("connected");
                    } else {
                        setError(`No chart data for ${stockSymbol} at ${intv}`);
                        setConnectionStatus("error");
                    }
                    return;
                }
                const getKlines =
                    marketType === "futures"
                        ? binanceService.getFuturesKlines.bind(binanceService)
                        : binanceService.getKlines.bind(binanceService);
                const raw = await getKlines(sym, intv, INITIAL_LIMIT);
                if (requestSeq !== initialFetchSeqRef.current) return;
                const mapped: OhlcvPoint[] = raw.map((k: any[]) => ({
                    ...binanceService.mapKline(k),
                    time: formatTime(k[0], intv),
                }));
                const enriched = enrich(mapped);
                allDataRef.current = enriched;
                setAllData(enriched);
                setError(null);
            } catch (err) {
                if (requestSeq !== initialFetchSeqRef.current) return;
                console.error("[useChartData] Failed to fetch klines:", err);
                setError(
                    err instanceof Error ? err.message : "Failed to load chart",
                );
                if (universe === "stock") {
                    allDataRef.current = [];
                    setAllData([]);
                    setConnectionStatus("error");
                }
            } finally {
                if (requestSeq !== initialFetchSeqRef.current) return;
                setIsLoading(false);
            }
        },
        [marketType, universe],
    );

    const fetchHistory = useCallback(async () => {
        if (isFetchingHistory) return;
        const oldest = allDataRef.current[0];
        if (!oldest) return;
        try {
            setIsFetchingHistory(true);
            if (universe === "stock") {
                const stockSymbol = resolvedSymbol.replace(/-C|-F/gi, "");
                const endDate = format(
                    new Date(oldest.timestamp - 24 * 60 * 60 * 1000),
                    "yyyy-MM-dd",
                );
                const raw = await stockLambdaService.getStockChart(
                    stockSymbol,
                    STOCK_RESOLUTION_BY_INTERVAL[interval],
                    STOCK_HISTORY_DAYS_BY_INTERVAL[interval],
                    { endDate },
                );
                if (raw.length === 0) return;
                const mapped: OhlcvPoint[] = raw.map((p) => ({
                    ...p,
                    time: formatTime(p.timestamp, interval),
                }));
                setAllData((prev) => {
                    const existing = new Set(prev.map((p) => p.timestamp));
                    const newOnes = mapped.filter(
                        (p) => !existing.has(p.timestamp),
                    );
                    if (!newOnes.length) return prev;
                    const merged = [...newOnes, ...prev].sort(
                        (a, b) => a.timestamp - b.timestamp,
                    );
                    const enriched = enrich(merged);
                    allDataRef.current = enriched;
                    return enriched;
                });
                return;
            }
            const getKlines =
                marketType === "futures"
                    ? binanceService.getFuturesKlines.bind(binanceService)
                    : binanceService.getKlines.bind(binanceService);
            const raw = await getKlines(
                resolvedSymbol,
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
    }, [resolvedSymbol, interval, isFetchingHistory, marketType, universe]);

    useEffect(() => {
        fetchInitial(resolvedSymbol, interval);
        if (universe === "stock") {
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
            return;
        }
        const streamInterval = INTERVAL_MAP[interval] ?? interval;
        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = subscribeSharedStream<KlineStreamEvent>({
            key: `kline:${marketType}:${resolvedSymbol}:${interval}`,
            url:
                marketType === "futures"
                    ? `wss://fstream.binance.com/ws/${resolvedSymbol.toLowerCase()}@kline_${streamInterval}`
                    : `wss://stream.binance.com:9443/ws/${resolvedSymbol.toLowerCase()}@kline_${streamInterval}`,
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
            initialFetchSeqRef.current += 1;
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
        };
    }, [resolvedSymbol, interval, marketType, fetchInitial, universe]);

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
        refetch: () => fetchInitial(resolvedSymbol, interval),
        connectionStatus,
    };
};
