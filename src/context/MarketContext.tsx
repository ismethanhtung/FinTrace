"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Asset,
    MarketType,
} from "../services/binanceService";
import {
    mergeMiniTickerArray,
    subscribeSharedStream,
    type MarketMiniTicker,
    type MarketStreamStatus,
} from "../services/marketStreamService";
import { useUniverse } from "./UniverseContext";
import { coinMarketAdapter } from "../services/adapters/coinMarketAdapter";
import { stockLambdaMarketAdapter } from "../services/adapters/stockLambdaMarketAdapter";
import { stockLambdaService } from "../services/stockLambdaService";
import { type AssetUniverse } from "../lib/marketUniverse";

const DEFAULT_SYMBOL_BY_UNIVERSE: Record<AssetUniverse, string> = {
    coin: "BTCUSDT",
    stock: "",
};
const STOCK_AUTO_HYDRATE_BATCH_SIZE = 25;
const STOCK_AUTO_HYDRATE_DELAY_MS = 120;

interface MarketContextType {
    universe: AssetUniverse;
    selectedSymbol: string;
    setSelectedSymbol: (symbol: string) => void;
    marketType: MarketType;
    setMarketType: (type: MarketType) => void;
    /** Spot assets (all USDT pairs sorted by volume) */
    spotAssets: Asset[];
    /** Futures assets (all USD-M perpetual USDT pairs sorted by volume) */
    futuresAssets: Asset[];
    /** Active asset list based on current marketType */
    assets: Asset[];
    isLoading: boolean;
    isFuturesLoading: boolean;
    error: string | null;
    spotStreamStatus: MarketStreamStatus;
    futuresStreamStatus: MarketStreamStatus;
    lastSpotStreamUpdateAt: number | null;
    lastFuturesStreamUpdateAt: number | null;
    hydrateStockSymbols: (symbols: string[]) => Promise<void>;
}

const MarketContext = React.createContext<MarketContextType | undefined>(
    undefined,
);

export const MarketProvider = ({ children }: { children: React.ReactNode }) => {
    const { universe, isHydrated = true } = useUniverse();
    const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
    const [marketType, setMarketType] = useState<MarketType>("spot");

    const [spotAssets, setSpotAssets] = useState<Asset[]>([]);
    const [futuresAssets, setFuturesAssets] = useState<Asset[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isFuturesLoading, setIsFuturesLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [spotStreamStatus, setSpotStreamStatus] =
        useState<MarketStreamStatus>("connecting");
    const [futuresStreamStatus, setFuturesStreamStatus] =
        useState<MarketStreamStatus>("connecting");
    const [lastSpotStreamUpdateAt, setLastSpotStreamUpdateAt] = useState<
        number | null
    >(null);
    const [lastFuturesStreamUpdateAt, setLastFuturesStreamUpdateAt] = useState<
        number | null
    >(null);

    const mountedRef = useRef(true);
    const spotRequestSeqRef = useRef(0);
    const futuresRequestSeqRef = useRef(0);
    const hydratedStockSpotRef = useRef<Set<string>>(new Set());
    const hydratingStockSpotRef = useRef<Set<string>>(new Set());
    const hydratedStockFuturesRef = useRef<Set<string>>(new Set());
    const hydratingStockFuturesRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // ── Spot bootstrap ──────────────────────────────────────────────────────────
    const fetchSpotAssets = useCallback(async () => {
        const requestSeq = ++spotRequestSeqRef.current;
        try {
            const adapter =
                universe === "stock"
                    ? stockLambdaMarketAdapter
                    : coinMarketAdapter;
            const next = await adapter.listAssets("spot");
            if (mountedRef.current && requestSeq === spotRequestSeqRef.current) {
                setSpotAssets(next);
                setError(null);
            }
        } catch (err) {
            console.error("[MarketProvider] Failed to fetch spot assets:", err);
            if (mountedRef.current && requestSeq === spotRequestSeqRef.current) {
                setError(
                    err instanceof Error
                        ? err.message
                        : `Failed to load ${universe} spot market data`,
                );
            }
        } finally {
            if (mountedRef.current && requestSeq === spotRequestSeqRef.current) {
                setIsLoading(false);
            }
        }
    }, [universe]);

    // ── Futures bootstrap ────────────────────────────────────────────────────────
    const fetchFuturesAssets = useCallback(async () => {
        const requestSeq = ++futuresRequestSeqRef.current;
        try {
            const adapter =
                universe === "stock"
                    ? stockLambdaMarketAdapter
                    : coinMarketAdapter;
            const next = await adapter.listAssets("futures");
            if (
                mountedRef.current &&
                requestSeq === futuresRequestSeqRef.current
            ) {
                setFuturesAssets(next);
                setError(null);
            }
        } catch (err) {
            console.error(
                "[MarketProvider] Failed to fetch futures assets:",
                err,
            );
        } finally {
            if (
                mountedRef.current &&
                requestSeq === futuresRequestSeqRef.current
            ) {
                setIsFuturesLoading(false);
            }
        }
    }, [universe]);

    // ── Initial bootstrap only ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isHydrated) return;
        setSpotAssets([]);
        setIsLoading(true);
        setError(null);
        hydratedStockSpotRef.current.clear();
        hydratingStockSpotRef.current.clear();
        fetchSpotAssets();
    }, [fetchSpotAssets, isHydrated]);

    useEffect(() => {
        if (!isHydrated) return;
        setFuturesAssets([]);
        setIsFuturesLoading(true);
        hydratedStockFuturesRef.current.clear();
        hydratingStockFuturesRef.current.clear();
        fetchFuturesAssets();
    }, [fetchFuturesAssets, isHydrated]);

    const hydrateStockSymbols = useCallback(
        async (symbols: string[]) => {
            if (!isHydrated) return;
            if (universe !== "stock") return;
            if (!symbols.length) return;

            const isFutures = marketType === "futures";
            const hydratedRef = isFutures
                ? hydratedStockFuturesRef
                : hydratedStockSpotRef;
            const hydratingRef = isFutures
                ? hydratingStockFuturesRef
                : hydratingStockSpotRef;

            const nextSymbols = Array.from(
                new Set(
                    symbols
                        .map((s) => s.trim().toUpperCase())
                        .filter(
                            (s) =>
                                Boolean(s) &&
                                !hydratedRef.current.has(s) &&
                                !hydratingRef.current.has(s),
                        ),
                ),
            );
            if (!nextSymbols.length) return;

            nextSymbols.forEach((s) => hydratingRef.current.add(s));

            try {
                const snapshotMap = await stockLambdaService.getBulkSnapshots(
                    nextSymbols,
                    marketType,
                );
                if (!mountedRef.current || !snapshotMap.size) return;
                const mergeAssets = (prev: Asset[]) =>
                    prev.map((asset) => snapshotMap.get(asset.id) ?? asset);

                if (isFutures) {
                    setFuturesAssets(mergeAssets);
                } else {
                    setSpotAssets(mergeAssets);
                }

                nextSymbols.forEach((s) => {
                    if (snapshotMap.has(s)) hydratedRef.current.add(s);
                });
            } catch (err) {
                console.error("[MarketProvider] Failed to hydrate stock symbols:", err);
            } finally {
                nextSymbols.forEach((s) => hydratingRef.current.delete(s));
            }
        },
        [isHydrated, marketType, universe],
    );

    // ── Live market tickers via websocket ───────────────────────────────────────
    useEffect(() => {
        if (!isHydrated) return;
        if (universe === "stock") {
            setSpotStreamStatus("connected");
            setLastSpotStreamUpdateAt(Date.now());
            return;
        }

        const sub = subscribeSharedStream<MarketMiniTicker[]>({
            key: "spot-miniTicker",
            url: "wss://stream.binance.com:9443/ws/!miniTicker@arr",
            parser: (raw) => (Array.isArray(raw) ? raw : null),
            onMessage: (payload) => {
                setSpotAssets((prev) =>
                    mergeMiniTickerArray(prev, payload, "spot"),
                );
                setLastSpotStreamUpdateAt(Date.now());
            },
            onStatus: setSpotStreamStatus,
        });

        return () => sub.unsubscribe();
    }, [isHydrated, universe]);

    useEffect(() => {
        if (!isHydrated) return;
        if (universe === "stock") {
            setFuturesStreamStatus("connected");
            setLastFuturesStreamUpdateAt(Date.now());
            return;
        }

        const sub = subscribeSharedStream<MarketMiniTicker[]>({
            key: "futures-miniTicker",
            url: "wss://fstream.binance.com/ws/!miniTicker@arr",
            parser: (raw) => (Array.isArray(raw) ? raw : null),
            onMessage: (payload) => {
                setFuturesAssets((prev) =>
                    mergeMiniTickerArray(prev, payload, "futures"),
                );
                setLastFuturesStreamUpdateAt(Date.now());
            },
            onStatus: setFuturesStreamStatus,
        });

        return () => sub.unsubscribe();
    }, [isHydrated, universe]);

    useEffect(() => {
        if (!isHydrated) return;
        const nextDefault = DEFAULT_SYMBOL_BY_UNIVERSE[universe];
        if (nextDefault) {
            setSelectedSymbol(nextDefault);
            return;
        }
        // For stock universe, don't force a hardcoded symbol on reload.
        setSelectedSymbol("");
    }, [isHydrated, universe]);

    useEffect(() => {
        if (!isHydrated) return;
        const current = marketType === "futures" ? futuresAssets : spotAssets;
        if (!current.length) return;
        if (current.some((asset) => asset.id === selectedSymbol)) return;
        setSelectedSymbol(current[0].id);
    }, [futuresAssets, isHydrated, marketType, selectedSymbol, spotAssets, universe]);

    // ── Active asset list based on marketType ────────────────────────────────────
    const assets = useMemo<Asset[]>(
        () => (marketType === "futures" ? futuresAssets : spotAssets),
        [marketType, spotAssets, futuresAssets],
    );

    useEffect(() => {
        if (!isHydrated) return;
        if (universe !== "stock") return;
        const activeAssets = marketType === "futures" ? futuresAssets : spotAssets;
        if (!activeAssets.length) return;

        const symbols = activeAssets.map((asset) => asset.id).filter(Boolean);
        if (!symbols.length) return;

        let cancelled = false;

        const hydrateAllInBatches = async () => {
            for (
                let i = 0;
                i < symbols.length && !cancelled;
                i += STOCK_AUTO_HYDRATE_BATCH_SIZE
            ) {
                const batch = symbols.slice(
                    i,
                    i + STOCK_AUTO_HYDRATE_BATCH_SIZE,
                );
                await hydrateStockSymbols(batch);
                if (
                    cancelled ||
                    i + STOCK_AUTO_HYDRATE_BATCH_SIZE >= symbols.length
                ) {
                    continue;
                }
                await new Promise((resolve) =>
                    setTimeout(resolve, STOCK_AUTO_HYDRATE_DELAY_MS),
                );
            }
        };

        void hydrateAllInBatches();

        return () => {
            cancelled = true;
        };
    }, [
        futuresAssets.length,
        hydrateStockSymbols,
        isHydrated,
        marketType,
        spotAssets.length,
        universe,
    ]);

    return (
        <MarketContext.Provider
            value={{
                universe,
                selectedSymbol,
                setSelectedSymbol,
                marketType,
                setMarketType,
                spotAssets,
                futuresAssets,
                assets,
                isLoading,
                isFuturesLoading,
                error,
                spotStreamStatus,
                futuresStreamStatus,
                lastSpotStreamUpdateAt,
                lastFuturesStreamUpdateAt,
                hydrateStockSymbols,
            }}
        >
            {children}
        </MarketContext.Provider>
    );
};

export const useMarket = () => {
    const ctx = React.useContext(MarketContext);
    if (!ctx) throw new Error("useMarket must be used within a MarketProvider");
    return ctx;
};
