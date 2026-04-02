import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { binanceService, type MarketType } from "../services/binanceService";
import {
    applyOrderBookDiff,
    createOrderBookState,
    deriveOrderBookData,
    subscribeSharedStream,
    type MarketStreamStatus,
    type OrderBookDiff,
    type OrderBookSnapshot,
    type OrderBookState,
    type DerivedOrderBookData,
} from "../services/marketStreamService";
import { useUniverse } from "../context/UniverseContext";
import { resolveUniverseSymbol } from "../lib/universeSymbol";
import { stockLambdaService } from "../services/stockLambdaService";

export type OrderBookEntry = {
    price: number;
    quantity: number;
    total: number;
    /** 0–1, cumulative depth as fraction of max total — for depth bar width */
    depth: number;
};

export type OrderBookData = DerivedOrderBookData;
export type OrderBookMetrics = {
    bidVolume: number;
    askVolume: number;
    imbalancePct: number;
    spreadBps: number;
    updatesPerSec10s: number;
    bestBid: number;
    bestAsk: number;
    bestBidQty: number;
    bestAskQty: number;
};
const SNAPSHOT_TIMEOUT_MS = 8_000;
const STOCK_DEPTH_POLL_MS = 2_000;

/**
 * Suggest the best default grouping for a given price.
 * Aims for ~4 significant grouping levels visible.
 */
export const GROUPING_OPTIONS = [0.01, 0.1, 1, 10, 50, 100, 1000] as const;
export type Grouping = (typeof GROUPING_OPTIONS)[number];

export function suggestGrouping(price: number): Grouping {
    if (price < 0.01) return 0.01;
    if (price < 0.5) return 0.01;
    if (price < 5) return 0.1;
    if (price < 50) return 0.1;
    if (price < 500) return 1;
    if (price < 5000) return 10;
    if (price < 50_000) return 50;
    return 100;
}

function depthKey(symbol: string, marketType: MarketType) {
    return `${marketType}:${symbol.toLowerCase()}:depth`;
}

function depthUrl(symbol: string, marketType: MarketType) {
    const pairLower = symbol.toLowerCase();
    return marketType === "futures"
        ? `wss://fstream.binance.com/ws/${pairLower}@depth@100ms`
        : `wss://stream.binance.com:9443/ws/${pairLower}@depth@100ms`;
}

function normalizeDepthDiff(raw: any): OrderBookDiff | null {
    if (!raw || typeof raw.U !== "number" || typeof raw.u !== "number") {
        return null;
    }

    const parseSide = (side: unknown): [string, string][] | undefined => {
        if (!Array.isArray(side)) return undefined;
        return side
            .map((entry) =>
                Array.isArray(entry) && entry.length >= 2
                    ? [String(entry[0]), String(entry[1])] as [string, string]
                    : null,
            )
            .filter((x): x is [string, string] => x !== null);
    };

    return {
        U: raw.U,
        u: raw.u,
        pu: typeof raw.pu === "number" ? raw.pu : undefined,
        b: parseSide(raw.b),
        a: parseSide(raw.a),
    };
}

type BookTickerEvent = {
    u?: number;
    s?: string;
    b: string;
    B: string;
    a: string;
    A: string;
};

function normalizeBookTicker(raw: any): BookTickerEvent | null {
    if (!raw) return null;
    if (typeof raw.b !== "string" || typeof raw.a !== "string") return null;
    if (typeof raw.B !== "string" || typeof raw.A !== "string") return null;
    return {
        u: typeof raw.u === "number" ? raw.u : undefined,
        s: typeof raw.s === "string" ? raw.s : undefined,
        b: raw.b,
        B: raw.B,
        a: raw.a,
        A: raw.A,
    };
}

/**
 * Group raw Binance order book entries by a price precision level.
 * Kept as a pure helper for backwards compatibility.
 */
function groupEntries(
    raw: string[][],
    grouping: number,
    side: "bid" | "ask",
    limitBuckets = 1000,
): { price: number; quantity: number }[] {
    const decimals =
        grouping < 1 ? (grouping.toString().split(".")[1]?.length ?? 0) : 0;

    const roundToDecimals = (value: number, d: number) => {
        const factor = 10 ** d;
        return Math.round(value * factor) / factor;
    };

    const map = new Map<number, number>();
    for (const [priceStr, qtyStr] of raw) {
        const price = parseFloat(priceStr);
        const qty = parseFloat(qtyStr);
        const keyRaw =
            side === "bid"
                ? Math.floor(price / grouping) * grouping
                : Math.ceil(price / grouping) * grouping;

        const key = roundToDecimals(keyRaw, decimals);
        map.set(key, (map.get(key) ?? 0) + qty);
    }
    return [...map.entries()]
        .map(([price, quantity]) => ({ price, quantity }))
        .sort((a, b) =>
            side === "bid" ? b.price - a.price : a.price - b.price,
        )
        .slice(0, limitBuckets);
}

function deriveDataFromState(
    state: OrderBookState | null,
    grouping: number,
): OrderBookData | null {
    return deriveOrderBookData(state, grouping);
}

/**
 * @param symbol - Trading pair symbol (e.g. "BTCUSDT")
 * @param grouping - Price grouping precision for bucketing orders
 * @param marketType - Which market to fetch depth from. Futures uses fapi; spot/margin use api.
 */
export const useOrderBook = (
    symbol: string,
    grouping: Grouping,
    marketType: MarketType = "spot",
) => {
    const { universe, isHydrated = true } = useUniverse();
    const { normalized: resolvedSymbol, isValid: hasValidSymbol } =
        resolveUniverseSymbol(symbol, universe);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] =
        useState<MarketStreamStatus>("connecting");
    const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
    const [bookVersion, setBookVersion] = useState(0);
    const [bookTicker, setBookTicker] = useState<BookTickerEvent | null>(null);
    const [updatesPerSec10s, setUpdatesPerSec10s] = useState(0);

    const bookRef = useRef<OrderBookState | null>(null);
    const pendingDiffsRef = useRef<OrderBookDiff[]>([]);
    const depthUpdateTsRef = useRef<number[]>([]);
    const loadingSnapshotRef = useRef(false);
    const pendingResyncRef = useRef(false);
    const snapshotRequestSeqRef = useRef(0);
    const mountedRef = useRef(true);
    const subscriptionRef = useRef<ReturnType<typeof subscribeSharedStream> | null>(
        null,
    );
    const bookTickerSubscriptionRef = useRef<
        ReturnType<typeof subscribeSharedStream> | null
    >(null);

    const resetBookState = useCallback(() => {
        bookRef.current = null;
        pendingDiffsRef.current = [];
        depthUpdateTsRef.current = [];
        loadingSnapshotRef.current = false;
        pendingResyncRef.current = false;
        setBookTicker(null);
        setUpdatesPerSec10s(0);
        setLastUpdatedAt(null);
        setBookVersion((v) => v + 1);
    }, []);

    const pushDepthUpdateTimestamp = useCallback(() => {
        const now = Date.now();
        const cutoff = now - 10_000;
        depthUpdateTsRef.current.push(now);
        depthUpdateTsRef.current = depthUpdateTsRef.current.filter(
            (ts) => ts >= cutoff,
        );
        setUpdatesPerSec10s(depthUpdateTsRef.current.length / 10);
    }, []);

    const applyBufferedDiffs = useCallback(() => {
        if (!bookRef.current || !pendingDiffsRef.current.length) return;
        const sorted = [...pendingDiffsRef.current].sort((a, b) => a.U - b.U);
        pendingDiffsRef.current = [];

        for (const diff of sorted) {
            if (!bookRef.current) return;
            const next = applyOrderBookDiff(bookRef.current, diff);
            if (!next) {
                // Gap detected while draining the buffer; resync from REST snapshot.
                void loadSnapshot();
                return;
            }
            bookRef.current = next;
            setLastUpdatedAt(Date.now());
            pushDepthUpdateTimestamp();
            setBookVersion((v) => v + 1);
        }
    }, [pushDepthUpdateTimestamp]);

    const loadSnapshot = useCallback(async () => {
        if (universe === "stock") {
            if (!isHydrated) {
                setIsLoading(true);
                return;
            }
            if (!hasValidSymbol || !resolvedSymbol) {
                setError("Invalid stock symbol for order book");
                setConnectionStatus("disconnected");
                setIsLoading(false);
                return;
            }
            if (loadingSnapshotRef.current) return;
            loadingSnapshotRef.current = true;
            const requestSeq = ++snapshotRequestSeqRef.current;
            if (!bookRef.current) setIsLoading(true);
            try {
                const snapshot = await stockLambdaService.getStockDepth(
                    resolvedSymbol,
                );
                if (requestSeq !== snapshotRequestSeqRef.current) {
                    return;
                }
                if (!snapshot) {
                    if (!bookRef.current) {
                        setError("Stock depth temporarily unavailable");
                        setConnectionStatus("disconnected");
                    }
                    return;
                }

                const bids = new Map<string, number>();
                const asks = new Map<string, number>();
                snapshot.bids.forEach((level) => {
                    bids.set(String(level.price), level.quantity);
                });
                snapshot.asks.forEach((level) => {
                    asks.set(String(level.price), level.quantity);
                });

                bookRef.current = {
                    lastUpdateId: Date.now(),
                    bids,
                    asks,
                };
                pendingDiffsRef.current = [];
                pushDepthUpdateTimestamp();
                setLastUpdatedAt(snapshot.fetchedAt || Date.now());
                setError(null);
                setConnectionStatus("connected");
                setBookVersion((v) => v + 1);
            } catch (err) {
                if (!bookRef.current) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load stock order book",
                    );
                }
                setConnectionStatus("error");
            } finally {
                loadingSnapshotRef.current = false;
                if (requestSeq !== snapshotRequestSeqRef.current) {
                    return;
                }
                if (mountedRef.current) setIsLoading(false);
            }
            return;
        }
        if (!isHydrated) {
            setIsLoading(true);
            return;
        }
        if (!hasValidSymbol || !resolvedSymbol) {
            setError("Invalid coin symbol for order book");
            setConnectionStatus("disconnected");
            setIsLoading(false);
            return;
        }
        if (loadingSnapshotRef.current) return;
        loadingSnapshotRef.current = true;
        const requestSeq = ++snapshotRequestSeqRef.current;
        setIsLoading(true);
        try {
            const getDepth =
                marketType === "futures"
                    ? binanceService.getFuturesDepth.bind(binanceService)
                    : binanceService.getDepth.bind(binanceService);
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error("Order book snapshot timeout"));
                }, SNAPSHOT_TIMEOUT_MS);
            });
            const raw = (await Promise.race([
                getDepth(resolvedSymbol, 1000),
                timeoutPromise,
            ])) as OrderBookSnapshot;
            if (requestSeq !== snapshotRequestSeqRef.current) {
                return;
            }
            const next = createOrderBookState(raw);
            bookRef.current = next;
            pendingDiffsRef.current = [];
            depthUpdateTsRef.current = [];
            setUpdatesPerSec10s(0);
            setLastUpdatedAt(Date.now());
            setError(null);
            setBookVersion((v) => v + 1);
            applyBufferedDiffs();
        } catch (err) {
            console.error("[useOrderBook] Failed to fetch depth snapshot:", err);
            setError(
                err instanceof Error ? err.message : "Failed to load order book",
            );
        } finally {
            loadingSnapshotRef.current = false;
            if (requestSeq !== snapshotRequestSeqRef.current) {
                return;
            }
            if (pendingResyncRef.current) {
                pendingResyncRef.current = false;
                setTimeout(() => {
                    if (mountedRef.current) void loadSnapshot();
                }, 0);
            }
            if (mountedRef.current) setIsLoading(false);
        }
    }, [
        applyBufferedDiffs,
        hasValidSymbol,
        isHydrated,
        marketType,
        pushDepthUpdateTimestamp,
        resetBookState,
        resolvedSymbol,
        universe,
    ]);

    const resync = useCallback(() => {
        pendingDiffsRef.current = [];
        bookRef.current = null;
        setBookVersion((v) => v + 1);
        setError("Order book stream out of sync. Resyncing...");
        if (loadingSnapshotRef.current) {
            pendingResyncRef.current = true;
            return;
        }
        void loadSnapshot();
    }, [loadSnapshot]);

    useEffect(() => {
        snapshotRequestSeqRef.current += 1;
        resetBookState();

        if (universe === "stock") {
            if (!isHydrated) {
                setIsLoading(true);
                setConnectionStatus("connecting");
                subscriptionRef.current?.unsubscribe();
                subscriptionRef.current = null;
                bookTickerSubscriptionRef.current?.unsubscribe();
                bookTickerSubscriptionRef.current = null;
                return;
            }
            mountedRef.current = true;
            setError(null);
            setConnectionStatus("connecting");
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
            bookTickerSubscriptionRef.current?.unsubscribe();
            bookTickerSubscriptionRef.current = null;
            void loadSnapshot();
            const timer = setInterval(() => {
                if (!mountedRef.current) return;
                void loadSnapshot();
            }, STOCK_DEPTH_POLL_MS);
            return () => {
                mountedRef.current = false;
                clearInterval(timer);
                subscriptionRef.current?.unsubscribe();
                subscriptionRef.current = null;
                bookTickerSubscriptionRef.current?.unsubscribe();
                bookTickerSubscriptionRef.current = null;
            };
        }
        if (!isHydrated) {
            setIsLoading(true);
            return;
        }
        if (!hasValidSymbol || !resolvedSymbol) {
            setIsLoading(false);
            setError("Invalid coin symbol for order book");
            setConnectionStatus("disconnected");
            subscriptionRef.current?.unsubscribe();
            bookTickerSubscriptionRef.current?.unsubscribe();
            return;
        }
        mountedRef.current = true;
        setIsLoading(true);
        setError(null);
        void loadSnapshot();

        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = subscribeSharedStream<OrderBookDiff>({
            key: depthKey(resolvedSymbol, marketType),
            url: depthUrl(resolvedSymbol, marketType),
            parser: (raw) => normalizeDepthDiff(raw),
            onMessage: (diff) => {
                if (!mountedRef.current) return;
                if (!bookRef.current) {
                    pendingDiffsRef.current.push(diff);
                    return;
                }
                const current = bookRef.current;
                if (diff.u <= current.lastUpdateId) return;
                const next = applyOrderBookDiff(current, diff);
                if (!next) {
                    resync();
                    return;
                }
                bookRef.current = next;
                setLastUpdatedAt(Date.now());
                pushDepthUpdateTimestamp();
                setBookVersion((v) => v + 1);
            },
            onStatus: setConnectionStatus,
        });

        bookTickerSubscriptionRef.current?.unsubscribe();
        const pairLower = resolvedSymbol.toLowerCase();
        const bookTickerUrl =
            marketType === "futures"
                ? `wss://fstream.binance.com/ws/${pairLower}@bookTicker`
                : `wss://stream.binance.com:9443/ws/${pairLower}@bookTicker`;
        bookTickerSubscriptionRef.current = subscribeSharedStream<BookTickerEvent>({
            key: `bookTicker:${marketType}:${resolvedSymbol.toLowerCase()}`,
            url: bookTickerUrl,
            parser: normalizeBookTicker,
            onMessage: (next) => setBookTicker(next),
        });

        return () => {
            mountedRef.current = false;
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
            bookTickerSubscriptionRef.current?.unsubscribe();
            bookTickerSubscriptionRef.current = null;
        };
    }, [
        hasValidSymbol,
        loadSnapshot,
        marketType,
        pushDepthUpdateTimestamp,
        resetBookState,
        resolvedSymbol,
        resync,
        isHydrated,
        universe,
    ]);

    const liveData = useMemo(
        () => deriveDataFromState(bookRef.current, grouping),
        [bookVersion, grouping],
    );
    const data = liveData;

    const metrics = useMemo<OrderBookMetrics | null>(() => {
        if (!data) return null;
        const bidVolume = data.bids.reduce((sum, row) => sum + row.quantity, 0);
        const askVolume = data.asks.reduce((sum, row) => sum + row.quantity, 0);
        const total = bidVolume + askVolume;
        const imbalancePct = total > 0 ? ((bidVolume - askVolume) / total) * 100 : 0;
        const spreadBps =
            data.midPrice > 0 ? (data.spread / data.midPrice) * 10_000 : 0;

        const bookBid = Number.parseFloat(bookTicker?.b ?? "");
        const bookAsk = Number.parseFloat(bookTicker?.a ?? "");
        const bookBidQty = Number.parseFloat(bookTicker?.B ?? "");
        const bookAskQty = Number.parseFloat(bookTicker?.A ?? "");

        return {
            bidVolume,
            askVolume,
            imbalancePct,
            spreadBps,
            updatesPerSec10s,
            bestBid: Number.isFinite(bookBid) ? bookBid : data.bids[0]?.price ?? 0,
            bestAsk: Number.isFinite(bookAsk) ? bookAsk : data.asks[0]?.price ?? 0,
            bestBidQty: Number.isFinite(bookBidQty)
                ? bookBidQty
                : data.bids[0]?.quantity ?? 0,
            bestAskQty: Number.isFinite(bookAskQty)
                ? bookAskQty
                : data.asks[0]?.quantity ?? 0,
        };
    }, [bookTicker, data, updatesPerSec10s]);

    return {
        data,
        metrics,
        isLoading,
        error,
        connectionStatus,
        lastUpdatedAt,
        refetch: loadSnapshot,
        reconnect: () => subscriptionRef.current?.reconnect(),
    };
};
