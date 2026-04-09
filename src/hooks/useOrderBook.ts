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
import { useDnseBoardStream } from "./useDnseBoardStream";
import { useVietcapBoardSnapshot } from "./useVietcapBoardSnapshot";

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
export type StockForeignStats = {
    buy: number;
    sell: number;
    room: number;
};
const SNAPSHOT_TIMEOUT_MS = 8_000;
const STOCK_VIETCAP_GROUPS = ["VN30", "HNX30", "HOSE", "HNX", "UPCOM"];
const STOCK_DNSE_BOARDS = ["G1", "G2", "G3"];
const DNSE_SOCKET_VOLUME_MULTIPLIER = 10;

/**
 * Suggest the best default grouping for a given price.
 * Aims for ~4 significant grouping levels visible.
 */
export const GROUPING_OPTIONS = [0.01, 0.1, 1, 10, 50, 100, 1000] as const;
export type Grouping = (typeof GROUPING_OPTIONS)[number];

type DepthSide = "bid" | "ask";

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

function normalizeStockDepthLevels(
    levels: Array<{ price: number; quantity: number }> | undefined,
    side: DepthSide,
    quantityMultiplier = 1,
) {
    if (!levels?.length) return [] as Array<{ price: number; quantity: number }>;
    return levels
        .map((level) => ({
            price: level.price,
            quantity: level.quantity * quantityMultiplier,
        }))
        .filter(
            (level) =>
                Number.isFinite(level.price) &&
                level.price > 0 &&
                Number.isFinite(level.quantity) &&
                level.quantity > 0,
        )
        .sort((a, b) =>
            side === "bid" ? b.price - a.price : a.price - b.price,
        );
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
    const hasInitialSnapshotRef = useRef(false);
    const mountedRef = useRef(true);
    const subscriptionRef = useRef<ReturnType<typeof subscribeSharedStream> | null>(
        null,
    );
    const bookTickerSubscriptionRef = useRef<
        ReturnType<typeof subscribeSharedStream> | null
    >(null);
    const stockSymbolsForStream = useMemo(
        () =>
            universe === "stock" && isHydrated && hasValidSymbol && resolvedSymbol
                ? [resolvedSymbol]
                : [],
        [hasValidSymbol, isHydrated, resolvedSymbol, universe],
    );
    const {
        status: stockStreamStatus,
        error: stockStreamError,
        dataBySymbol: stockStreamBySymbol,
        lastUpdatedAt: stockStreamLastUpdatedAt,
    } = useDnseBoardStream(stockSymbolsForStream, {
        board: "G1",
        boards: STOCK_DNSE_BOARDS,
        resolution: "1",
    });
    const {
        snapshotBySymbol: stockSnapshotBySymbol,
        fetchedAt: stockSnapshotFetchedAt,
        isLoading: isStockSnapshotLoading,
        error: stockSnapshotError,
        refetch: refetchStockSnapshot,
    } = useVietcapBoardSnapshot({
        enabled: universe === "stock",
        groups: STOCK_VIETCAP_GROUPS,
        refreshIntervalMs: 45_000,
    });

    const resetBookState = useCallback(() => {
        bookRef.current = null;
        pendingDiffsRef.current = [];
        depthUpdateTsRef.current = [];
        loadingSnapshotRef.current = false;
        pendingResyncRef.current = false;
        hasInitialSnapshotRef.current = false;
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
        if (universe === "stock") return;
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
        setIsLoading(!hasInitialSnapshotRef.current);
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
            hasInitialSnapshotRef.current = true;
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
            setIsLoading(false);
            setError(null);
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
            bookTickerSubscriptionRef.current?.unsubscribe();
            bookTickerSubscriptionRef.current = null;
            return () => {
                mountedRef.current = false;
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
    const stockData = useMemo(() => {
        if (universe !== "stock") return null;
        if (!isHydrated || !hasValidSymbol || !resolvedSymbol) return null;

        const stream = stockStreamBySymbol[resolvedSymbol];
        const snapshot = stockSnapshotBySymbol[resolvedSymbol];
        const streamBids = normalizeStockDepthLevels(
            stream?.bid,
            "bid",
            DNSE_SOCKET_VOLUME_MULTIPLIER,
        );
        const streamAsks = normalizeStockDepthLevels(
            stream?.offer,
            "ask",
            DNSE_SOCKET_VOLUME_MULTIPLIER,
        );
        const snapshotBids = normalizeStockDepthLevels(snapshot?.bid, "bid");
        const snapshotAsks = normalizeStockDepthLevels(snapshot?.offer, "ask");
        const bids = streamBids.length ? streamBids : snapshotBids;
        const asks = streamAsks.length ? streamAsks : snapshotAsks;
        if (!bids.length && !asks.length) return null;

        const state: OrderBookState = {
            lastUpdateId: stockStreamLastUpdatedAt ?? Date.now(),
            bids: new Map(bids.map((level) => [String(level.price), level.quantity])),
            asks: new Map(asks.map((level) => [String(level.price), level.quantity])),
        };
        return deriveDataFromState(state, grouping);
    }, [
        grouping,
        hasValidSymbol,
        isHydrated,
        resolvedSymbol,
        stockSnapshotBySymbol,
        stockStreamBySymbol,
        stockStreamLastUpdatedAt,
        universe,
    ]);
    const data = universe === "stock" ? stockData : liveData;

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
            updatesPerSec10s: universe === "stock" ? 0 : updatesPerSec10s,
            bestBid: Number.isFinite(bookBid) ? bookBid : data.bids[0]?.price ?? 0,
            bestAsk: Number.isFinite(bookAsk) ? bookAsk : data.asks[0]?.price ?? 0,
            bestBidQty: Number.isFinite(bookBidQty)
                ? bookBidQty
                : data.bids[0]?.quantity ?? 0,
            bestAskQty: Number.isFinite(bookAskQty)
                ? bookAskQty
                : data.asks[0]?.quantity ?? 0,
        };
    }, [bookTicker, data, universe, updatesPerSec10s]);

    const stockError = useMemo(() => {
        if (universe !== "stock") return null;
        if (!isHydrated) return null;
        if (!hasValidSymbol || !resolvedSymbol) {
            return "Invalid stock symbol for order book";
        }
        return stockStreamError || stockSnapshotError || null;
    }, [
        hasValidSymbol,
        isHydrated,
        resolvedSymbol,
        stockSnapshotError,
        stockStreamError,
        universe,
    ]);

    const stockLastUpdatedAt = useMemo(() => {
        if (stockStreamLastUpdatedAt) return stockStreamLastUpdatedAt;
        if (!stockSnapshotFetchedAt) return null;
        const parsed = Date.parse(stockSnapshotFetchedAt);
        return Number.isFinite(parsed) ? parsed : null;
    }, [stockSnapshotFetchedAt, stockStreamLastUpdatedAt]);

    const stockIsLoading =
        universe === "stock" &&
        !data &&
        (isStockSnapshotLoading || stockStreamStatus === "connecting");
    const stockForeignStats = useMemo<StockForeignStats | null>(() => {
        if (universe !== "stock" || !resolvedSymbol) return null;
        const snapshot = stockSnapshotBySymbol[resolvedSymbol];
        if (!snapshot) return null;
        return {
            buy: Number.isFinite(snapshot.foreignBuy) ? snapshot.foreignBuy : 0,
            sell: Number.isFinite(snapshot.foreignSell)
                ? snapshot.foreignSell
                : 0,
            room: Number.isFinite(snapshot.foreignRoom)
                ? snapshot.foreignRoom
                : 0,
        };
    }, [resolvedSymbol, stockSnapshotBySymbol, universe]);
    const effectiveConnectionStatus: MarketStreamStatus =
        universe === "stock"
            ? stockStreamStatus === "connected"
                ? "connected"
                : stockStreamStatus === "connecting"
                  ? "connecting"
                  : stockStreamStatus === "error"
                    ? "error"
                    : "disconnected"
            : connectionStatus;

    return {
        data,
        metrics,
        isLoading: universe === "stock" ? stockIsLoading : isLoading,
        error: universe === "stock" ? stockError : error,
        connectionStatus: effectiveConnectionStatus,
        lastUpdatedAt: universe === "stock" ? stockLastUpdatedAt : lastUpdatedAt,
        refetch:
            universe === "stock"
                ? async () => {
                      await refetchStockSnapshot();
                  }
                : loadSnapshot,
        stockForeignStats,
        reconnect: () => subscriptionRef.current?.reconnect(),
    };
};
