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
import { type AssetUniverse } from "../lib/marketUniverse";

const DEFAULT_SYMBOL_BY_UNIVERSE: Record<AssetUniverse, string> = {
    coin: "BTCUSDT",
    stock: "FPT",
};

interface MarketContextType {
    universe: AssetUniverse;
    isMockUniverse: boolean;
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
}

const MarketContext = React.createContext<MarketContextType | undefined>(
    undefined,
);

export const MarketProvider = ({ children }: { children: React.ReactNode }) => {
    const { universe, isMockUniverse } = useUniverse();
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
        setSpotAssets([]);
        setIsLoading(true);
        setError(null);
        fetchSpotAssets();
    }, [fetchSpotAssets]);

    useEffect(() => {
        setFuturesAssets([]);
        setIsFuturesLoading(true);
        fetchFuturesAssets();
    }, [fetchFuturesAssets]);

    // ── Live market tickers via websocket ───────────────────────────────────────
    useEffect(() => {
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
    }, [universe]);

    useEffect(() => {
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
    }, [universe]);

    useEffect(() => {
        const nextDefault = DEFAULT_SYMBOL_BY_UNIVERSE[universe];
        setSelectedSymbol(nextDefault);
    }, [universe]);

    useEffect(() => {
        const current = marketType === "futures" ? futuresAssets : spotAssets;
        if (!current.length) return;
        if (current.some((asset) => asset.id === selectedSymbol)) return;
        setSelectedSymbol(current[0].id);
    }, [marketType, futuresAssets, selectedSymbol, spotAssets, universe]);

    // ── Active asset list based on marketType ────────────────────────────────────
    const assets = useMemo<Asset[]>(
        () => (marketType === "futures" ? futuresAssets : spotAssets),
        [marketType, spotAssets, futuresAssets],
    );

    return (
        <MarketContext.Provider
            value={{
                universe,
                isMockUniverse,
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
