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
import { getMockStockBasePrice } from "../lib/mockStockData";

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
    const { universe } = useUniverse();
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
    const mountedRef = useRef(true);
    const subscriptionRef = useRef<ReturnType<typeof subscribeSharedStream> | null>(
        null,
    );
    const bookTickerSubscriptionRef = useRef<
        ReturnType<typeof subscribeSharedStream> | null
    >(null);

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
            setIsLoading(false);
            setError(null);
            setConnectionStatus("connected");
            setLastUpdatedAt(Date.now());
            return;
        }
        if (loadingSnapshotRef.current) return;
        loadingSnapshotRef.current = true;
        setIsLoading(true);
        try {
            const getDepth =
                marketType === "futures"
                    ? binanceService.getFuturesDepth.bind(binanceService)
                    : binanceService.getDepth.bind(binanceService);
            const raw = (await getDepth(symbol, 1000)) as OrderBookSnapshot;
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
            if (pendingResyncRef.current) {
                pendingResyncRef.current = false;
                setTimeout(() => {
                    if (mountedRef.current) void loadSnapshot();
                }, 0);
            }
            if (mountedRef.current) setIsLoading(false);
        }
    }, [applyBufferedDiffs, marketType, symbol, universe]);

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
        if (universe === "stock") {
            setIsLoading(false);
            setError(null);
            setConnectionStatus("connected");
            setLastUpdatedAt(Date.now());
            subscriptionRef.current?.unsubscribe();
            bookTickerSubscriptionRef.current?.unsubscribe();
            return;
        }
        mountedRef.current = true;
        setIsLoading(true);
        setError(null);
        bookRef.current = null;
        pendingDiffsRef.current = [];
        setBookVersion((v) => v + 1);
        void loadSnapshot();

        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = subscribeSharedStream<OrderBookDiff>({
            key: depthKey(symbol, marketType),
            url: depthUrl(symbol, marketType),
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
        const pairLower = symbol.toLowerCase();
        const bookTickerUrl =
            marketType === "futures"
                ? `wss://fstream.binance.com/ws/${pairLower}@bookTicker`
                : `wss://stream.binance.com:9443/ws/${pairLower}@bookTicker`;
        bookTickerSubscriptionRef.current = subscribeSharedStream<BookTickerEvent>({
            key: `bookTicker:${marketType}:${pairLower}`,
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
    }, [marketType, resync, symbol, loadSnapshot, pushDepthUpdateTimestamp, universe]);

    const mockData = useMemo<OrderBookData | null>(() => {
        if (universe !== "stock") return null;
        const mid = getMockStockBasePrice(symbol.replace(/-(C|F)$/i, ""));
        const bids = Array.from({ length: 16 }, (_, i) => {
            const price = Number((mid - (i + 1) * 0.05).toFixed(2));
            const quantity = Number((100 + i * 20).toFixed(2));
            return { price, quantity, total: 0, depth: 0 };
        });
        const asks = Array.from({ length: 16 }, (_, i) => {
            const price = Number((mid + (i + 1) * 0.05).toFixed(2));
            const quantity = Number((95 + i * 22).toFixed(2));
            return { price, quantity, total: 0, depth: 0 };
        });
        let bidRunning = 0;
        let askRunning = 0;
        for (const bid of bids) {
            bidRunning += bid.quantity;
            bid.total = bidRunning;
        }
        for (const ask of asks) {
            askRunning += ask.quantity;
            ask.total = askRunning;
        }
        const maxTotal = Math.max(bidRunning, askRunning);
        for (const bid of bids) bid.depth = maxTotal > 0 ? bid.total / maxTotal : 0;
        for (const ask of asks) ask.depth = maxTotal > 0 ? ask.total / maxTotal : 0;
        return {
            bids,
            asks,
            spread: asks[0].price - bids[0].price,
            spreadPercent:
                bids[0].price > 0
                    ? ((asks[0].price - bids[0].price) / bids[0].price) * 100
                    : 0,
            midPrice: (asks[0].price + bids[0].price) / 2,
        };
    }, [symbol, universe]);

    const liveData = useMemo(
        () => deriveDataFromState(bookRef.current, grouping),
        [bookVersion, grouping],
    );
    const data = universe === "stock" ? mockData : liveData;

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
