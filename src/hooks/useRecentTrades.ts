import { useCallback, useEffect, useRef, useState } from "react";
import {
    binanceService,
    type MarketType,
    type BinanceRecentTrade,
} from "../services/binanceService";
import {
    normalizeTradeStreamEvent,
    subscribeSharedStream,
    type MarketStreamStatus,
    type TradeStreamEvent,
} from "../services/marketStreamService";

export type RecentTradeItem = {
    id: number;
    price: number;
    qty: number;
    time: number;
    isBuy: boolean;
};

function mapTrade(t: BinanceRecentTrade): RecentTradeItem {
    return {
        id: t.id,
        price: parseFloat(t.price),
        qty: parseFloat(t.qty),
        time: t.time,
        // Binance: isBuyerMaker=true => taker is seller => sell pressure
        isBuy: !t.isBuyerMaker,
    };
}

function tradeKey(symbol: string, marketType: MarketType) {
    const pairLower = symbol.toLowerCase();
    return `${marketType}:${pairLower}:trade`;
}

function tradeUrl(symbol: string, marketType: MarketType) {
    const pairLower = symbol.toLowerCase();
    return marketType === "futures"
        ? `wss://fstream.binance.com/ws/${pairLower}@trade`
        : `wss://stream.binance.com:9443/ws/${pairLower}@trade`;
}

/**
 * Fetch real recent trades from Binance with websocket updates.
 */
export const useRecentTrades = (
    symbol: string,
    marketType: MarketType,
    limit = 80,
) => {
    const [trades, setTrades] = useState<RecentTradeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] =
        useState<MarketStreamStatus>("connecting");

    const mountedRef = useRef(true);
    const subscriptionRef = useRef<ReturnType<typeof subscribeSharedStream> | null>(
        null,
    );

    const fetchSnapshot = useCallback(async () => {
        try {
            const getTrades =
                marketType === "futures"
                    ? binanceService.getFuturesRecentTrades.bind(binanceService)
                    : binanceService.getRecentTrades.bind(binanceService);
            const raw = await getTrades(symbol, limit);
            const next = raw.map(mapTrade).sort((a, b) => b.time - a.time);
            if (!mountedRef.current) return;
            setTrades(next);
            setError(null);
        } catch (err: unknown) {
            console.error("[useRecentTrades] Failed to fetch recent trades:", err);
            if (!mountedRef.current) return;
            setError(
                err instanceof Error ? err.message : "Failed to fetch recent trades",
            );
        } finally {
            if (mountedRef.current) setIsLoading(false);
        }
    }, [symbol, marketType, limit]);

    useEffect(() => {
        mountedRef.current = true;
        setIsLoading(true);
        fetchSnapshot();

        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = subscribeSharedStream<TradeStreamEvent>({
            key: tradeKey(symbol, marketType),
            url: tradeUrl(symbol, marketType),
            parser: (raw) => (raw && raw.e === "trade" ? raw : null),
            onMessage: (raw) => {
                const item = normalizeTradeStreamEvent(raw);
                if (!item || !mountedRef.current) return;
                setTrades((prev) => {
                    const exists = prev.some((trade) => trade.id === item.id);
                    if (exists) return prev;
                    const next = [{ ...item } as RecentTradeItem, ...prev]
                        .sort((a, b) => b.time - a.time)
                        .slice(0, limit);
                    return next;
                });
            },
            onStatus: setConnectionStatus,
        });

        return () => {
            mountedRef.current = false;
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
        };
    }, [fetchSnapshot, limit, marketType, symbol]);

    return {
        trades,
        isLoading,
        error,
        refetch: fetchSnapshot,
        connectionStatus,
    };
};
