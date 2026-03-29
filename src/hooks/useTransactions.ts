import { useCallback, useEffect, useRef, useState } from "react";
import {
    binanceService,
    type BinanceRecentTrade,
    type MarketType,
} from "../services/binanceService";
import {
    normalizeTradeStreamEvent,
    subscribeSharedStream,
    type TradeStreamEvent,
} from "../services/marketStreamService";
import { useUniverse } from "../context/UniverseContext";
import { createMockStockTradeTape } from "../lib/mockStockData";

export type Transaction = {
    id: number;
    symbol: string; // base symbol (e.g. BTC)
    pair: string; // pair id (e.g. BTCUSDT)
    price: number;
    qty: number;
    quoteQty: number;
    timeMs: number;
    timeLabel: string;
    isBuy: boolean;
    type: "buy" | "sell";
};

function mapTrade(t: BinanceRecentTrade, pair: string): Transaction {
    const quoteQty = t.quoteQty
        ? parseFloat(t.quoteQty)
        : parseFloat(t.price) * parseFloat(t.qty);
    const baseSymbol = pair.replace("USDT", "");
    const timeLabel = new Date(t.time).toLocaleTimeString("en", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    // isBuyerMaker=true => buyer placed maker order => taker (buyer) is the seller
    const isBuy = !t.isBuyerMaker;
    return {
        id: t.id,
        symbol: baseSymbol,
        pair,
        price: parseFloat(t.price),
        qty: parseFloat(t.qty),
        quoteQty,
        timeMs: t.time,
        timeLabel,
        isBuy,
        type: isBuy ? "buy" : "sell",
    };
}

export type UseTransactionsOptions = {
    symbol: string; // pair id, e.g. BTCUSDT
    marketType: MarketType;
    limit?: number;
    pollingMs?: number | null; // kept for API compatibility; websocket-first ignores polling
};

type FetchMode = "initial" | "manual";

/**
 * Fetch recent trades from Binance spot/futures using a websocket stream.
 */
export const useTransactions = ({
    symbol,
    marketType,
    limit = 500,
}: UseTransactionsOptions) => {
    const { universe } = useUniverse();
    const resolvedSymbol =
        universe === "coin" && !symbol.toUpperCase().endsWith("USDT")
            ? "BTCUSDT"
            : symbol;
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inFlightRef = useRef(false);
    const mountedRef = useRef(true);
    const subscriptionRef = useRef<ReturnType<typeof subscribeSharedStream> | null>(
        null,
    );

    const fetchTrades = useCallback(
        async (mode: FetchMode = "initial") => {
            if (!symbol || inFlightRef.current) return;
            inFlightRef.current = true;

            try {
                if (mode === "initial") {
                    setIsLoading(true);
                    setError(null);
                }
                if (mode === "manual") {
                    setIsRefreshing(true);
                }

                if (universe === "stock") {
                    const next = createMockStockTradeTape(symbol, limit)
                        .map((t) => {
                            const quoteQty = t.price * t.qty;
                            const timeLabel = new Date(t.time).toLocaleTimeString("en", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            });
                            return {
                                id: t.id,
                                symbol: symbol.replace(/-(C|F)$/i, ""),
                                pair: symbol,
                                price: t.price,
                                qty: t.qty,
                                quoteQty,
                                timeMs: t.time,
                                timeLabel,
                                isBuy: t.isBuy,
                                type: t.isBuy ? "buy" : "sell",
                            } as Transaction;
                        })
                        .sort((a, b) => b.timeMs - a.timeMs);
                    if (mountedRef.current) {
                        setTransactions(next);
                        setError(null);
                    }
                    return;
                }

                const getTrades =
                    marketType === "futures"
                        ? binanceService.getFuturesRecentTrades.bind(binanceService)
                        : binanceService.getRecentTrades.bind(binanceService);

                const raw = await getTrades(resolvedSymbol, limit);
                const next = raw
                    .map((t) => mapTrade(t, resolvedSymbol))
                    .sort((a, b) => b.timeMs - a.timeMs);

                if (mountedRef.current) {
                    setTransactions(next);
                    setError(null);
                }
            } catch (err: unknown) {
                console.error("[useTransactions] Failed to fetch transactions:", err);
                if (mountedRef.current) {
                    const msg =
                        err instanceof Error
                            ? err.message
                            : "Failed to fetch transactions";
                    setError(msg);
                    if (mode === "initial" || mode === "manual") {
                        setTransactions([]);
                    }
                }
            } finally {
                inFlightRef.current = false;
                if (mountedRef.current) {
                    if (mode === "initial") setIsLoading(false);
                    if (mode === "manual") setIsRefreshing(false);
                }
            }
        },
        [marketType, symbol, limit, universe, resolvedSymbol],
    );

    useEffect(() => {
        mountedRef.current = true;
        fetchTrades("initial");

        if (universe === "stock") {
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
            return () => {
                mountedRef.current = false;
                subscriptionRef.current?.unsubscribe();
                subscriptionRef.current = null;
            };
        }

        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = subscribeSharedStream<TradeStreamEvent>({
            key: `transactions:${marketType}:${resolvedSymbol}`,
            url:
                marketType === "futures"
                    ? `wss://fstream.binance.com/ws/${resolvedSymbol.toLowerCase()}@trade`
                    : `wss://stream.binance.com:9443/ws/${resolvedSymbol.toLowerCase()}@trade`,
            parser: (raw) => (raw && raw.e === "trade" ? raw : null),
            onMessage: (raw) => {
                const item = normalizeTradeStreamEvent(raw);
                if (!item || !mountedRef.current) return;
                const pair = resolvedSymbol;
                const tx = mapTrade(
                    {
                        id: item.id,
                        price: String(item.price),
                        qty: String(item.qty),
                        time: item.time,
                        isBuyerMaker: !item.isBuy,
                    },
                    pair,
                );
                setTransactions((prev) => {
                    if (prev.some((t) => t.id === tx.id)) return prev;
                    return [tx, ...prev].sort((a, b) => b.timeMs - a.timeMs).slice(0, limit);
                });
            },
        });

        return () => {
            mountedRef.current = false;
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
        };
    }, [fetchTrades, limit, marketType, symbol, universe, resolvedSymbol]);

    return {
        transactions,
        isLoading,
        isRefreshing,
        error,
        refetch: () => fetchTrades("manual"),
    };
};
