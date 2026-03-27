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

export type OrderBookEntry = {
    price: number;
    quantity: number;
    total: number;
    /** 0–1, cumulative depth as fraction of max total — for depth bar width */
    depth: number;
};

export type OrderBookData = DerivedOrderBookData;

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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] =
        useState<MarketStreamStatus>("connecting");
    const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
    const [bookVersion, setBookVersion] = useState(0);

    const bookRef = useRef<OrderBookState | null>(null);
    const pendingDiffsRef = useRef<OrderBookDiff[]>([]);
    const loadingSnapshotRef = useRef(false);
    const pendingResyncRef = useRef(false);
    const mountedRef = useRef(true);
    const subscriptionRef = useRef<ReturnType<typeof subscribeSharedStream> | null>(
        null,
    );

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
            setBookVersion((v) => v + 1);
        }
    }, []);

    const loadSnapshot = useCallback(async () => {
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
    }, [applyBufferedDiffs, marketType, symbol]);

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
                setBookVersion((v) => v + 1);
            },
            onStatus: setConnectionStatus,
        });

        return () => {
            mountedRef.current = false;
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
        };
    }, [marketType, resync, symbol, loadSnapshot]);

    const data = useMemo(
        () => deriveDataFromState(bookRef.current, grouping),
        [bookVersion, grouping],
    );

    return {
        data,
        isLoading,
        error,
        connectionStatus,
        lastUpdatedAt,
        refetch: loadSnapshot,
        reconnect: () => subscriptionRef.current?.reconnect(),
    };
};
