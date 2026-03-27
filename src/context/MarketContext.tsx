"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    binanceService,
    Asset,
    BinanceTicker,
    MarketType,
} from "../services/binanceService";
import { enrichAssetsWithLogos } from "../services/tokenLogoService";
import { isLeveragedToken } from "../lib/tokenFilters";
import {
    mergeMiniTickerArray,
    subscribeSharedStream,
    type MarketMiniTicker,
    type MarketStreamStatus,
} from "../services/marketStreamService";

interface MarketContextType {
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

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // ── Spot bootstrap ──────────────────────────────────────────────────────────
    const fetchSpotAssets = useCallback(async () => {
        try {
            const tickers: BinanceTicker[] = await binanceService.getTickers();
            const allUSDT = tickers
                .filter(
                    (t) =>
                        t.symbol.endsWith("USDT") &&
                        !isLeveragedToken(t.symbol.slice(0, -4)),
                )
                .sort(
                    (a, b) =>
                        parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume),
                );
            let next = allUSDT.map(binanceService.transformTicker);
            next = await enrichAssetsWithLogos(next);
            if (mountedRef.current) {
                setSpotAssets(next);
                setError(null);
            }
        } catch (err) {
            console.error("[MarketProvider] Failed to fetch spot assets:", err);
            if (mountedRef.current) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load spot market data",
                );
            }
        } finally {
            if (mountedRef.current) setIsLoading(false);
        }
    }, []);

    // ── Futures bootstrap ────────────────────────────────────────────────────────
    const fetchFuturesAssets = useCallback(async () => {
        try {
            const tickers = await binanceService.getFuturesTickers();
            // Keep only USDT-M perpetuals (exclude quarterly contracts like BTCUSDT_230630)
            const allUSDT = tickers
                .filter(
                    (t) =>
                        t.symbol.endsWith("USDT") &&
                        !t.symbol.includes("_") &&
                        !isLeveragedToken(t.symbol.slice(0, -4)),
                )
                .sort(
                    (a, b) =>
                        parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume),
                );
            const next = await enrichAssetsWithLogos(
                allUSDT.map(binanceService.transformFuturesTicker),
            );
            if (mountedRef.current) {
                setFuturesAssets(next);
                setError(null);
            }
        } catch (err) {
            console.error(
                "[MarketProvider] Failed to fetch futures assets:",
                err,
            );
        } finally {
            if (mountedRef.current) setIsFuturesLoading(false);
        }
    }, []);

    // ── Initial bootstrap only ──────────────────────────────────────────────────
    useEffect(() => {
        fetchSpotAssets();
    }, [fetchSpotAssets]);

    useEffect(() => {
        fetchFuturesAssets();
    }, [fetchFuturesAssets]);

    // ── Live market tickers via websocket ───────────────────────────────────────
    useEffect(() => {
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
    }, []);

    useEffect(() => {
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
    }, []);

    // ── Active asset list based on marketType ────────────────────────────────────
    const assets = useMemo<Asset[]>(
        () => (marketType === "futures" ? futuresAssets : spotAssets),
        [marketType, spotAssets, futuresAssets],
    );

    return (
        <MarketContext.Provider
            value={{
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
