import { useState, useEffect, useCallback, useRef } from "react";
import { binanceService, type FuturesPremiumIndex, type MarketType } from "../services/binanceService";
import {
    normalizeMarkPriceStreamEvent,
    subscribeSharedStream,
    type MarketStreamStatus,
    type MarkPriceStreamEvent,
} from "../services/marketStreamService";
import { useUniverse } from "../context/UniverseContext";

export type { FuturesPremiumIndex };

/**
 * Fetches Binance Futures premium index with websocket updates.
 * Provides mark price, index price, funding rate, and next funding time.
 *
 * Only fetches when `marketType === 'futures'`; returns null otherwise.
 */
export const useFuturesPremiumIndex = (
    symbol: string,
    marketType: MarketType,
) => {
    const { universe } = useUniverse();
    const [data, setData] = useState<FuturesPremiumIndex | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] =
        useState<MarketStreamStatus>("connecting");
    const abortRef = useRef<AbortController | null>(null);
    const subscriptionRef = useRef<ReturnType<typeof subscribeSharedStream> | null>(
        null,
    );

    const fetchData = useCallback(async () => {
        if (marketType !== "futures") {
            setData(null);
            setError(null);
            setIsLoading(false);
            return;
        }
        if (universe === "stock") {
            setData(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setIsLoading(true);
        try {
            const result = await binanceService.getFuturesPremiumIndex(symbol);
            setData(result);
            setError(null);
        } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") return;
            console.error(
                "[useFuturesPremiumIndex] Failed to fetch premium index:",
                err,
            );
            setError(
                err instanceof Error ? err.message : "Failed to load futures data",
            );
        } finally {
            setIsLoading(false);
        }
    }, [symbol, marketType, universe]);

    useEffect(() => {
        fetchData();

        subscriptionRef.current?.unsubscribe();
        if (marketType !== "futures" || universe === "stock") {
            setConnectionStatus("disconnected");
            return () => {
                abortRef.current?.abort();
            };
        }

        subscriptionRef.current = subscribeSharedStream<MarkPriceStreamEvent>({
            key: `mark-price:${symbol}`,
            url: `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@markPrice@1s`,
            parser: (raw) => (raw && raw.e === "markPriceUpdate" ? raw : null),
            onMessage: (raw) => {
                const normalized = normalizeMarkPriceStreamEvent(raw);
                if (!normalized) return;
                setData((prev) => {
                    const next: FuturesPremiumIndex = {
                        symbol,
                        markPrice: String(normalized.markPrice),
                        indexPrice: String(normalized.indexPrice),
                        estimatedSettlePrice: prev?.estimatedSettlePrice ?? String(normalized.markPrice),
                        lastFundingRate: String(normalized.fundingRate),
                        nextFundingTime: normalized.nextFundingTime,
                        interestRate: prev?.interestRate ?? "0",
                        time: normalized.eventTime,
                    };
                    return next;
                });
            },
            onStatus: setConnectionStatus,
        });

        return () => {
            abortRef.current?.abort();
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
        };
    }, [fetchData, marketType, symbol, universe]);

    /** Derived: funding rate as percentage string (e.g. "+0.0100%") */
    const fundingRatePct = data
        ? `${parseFloat(data.lastFundingRate) >= 0 ? "+" : ""}${(parseFloat(data.lastFundingRate) * 100).toFixed(4)}%`
        : null;

    /** Derived: ms until next funding event */
    const msToNextFunding = data
        ? Math.max(0, data.nextFundingTime - Date.now())
        : null;

    return {
        data,
        isLoading,
        error,
        fundingRatePct,
        msToNextFunding,
        refetch: fetchData,
        connectionStatus,
    };
};
