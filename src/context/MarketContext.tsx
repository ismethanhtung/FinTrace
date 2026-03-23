"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    binanceService,
    Asset,
    BinanceTicker,
    MarketType,
} from "../services/binanceService";
import { enrichAssetsWithLogos } from "../services/tokenLogoService";

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

    // ── Spot fetch ───────────────────────────────────────────────────────────────
    const fetchSpotAssets = useCallback(async () => {
        try {
            const tickers: BinanceTicker[] = await binanceService.getTickers();
            const allUSDT = tickers
                .filter((t) => t.symbol.endsWith("USDT"))
                .sort(
                    (a, b) =>
                        parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume),
                );
            let next = allUSDT.map(binanceService.transformTicker);
            next = await enrichAssetsWithLogos(next);
            setSpotAssets(next);
            setError(null);
        } catch (err) {
            console.error("[MarketProvider] Failed to fetch spot assets:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load spot market data",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Futures fetch ────────────────────────────────────────────────────────────
    const fetchFuturesAssets = useCallback(async () => {
        try {
            setIsFuturesLoading(true);
            const tickers = await binanceService.getFuturesTickers();
            // Keep only USDT-M perpetuals (exclude quarterly contracts like BTCUSDT_230630)
            const allUSDT = tickers
                .filter(
                    (t) => t.symbol.endsWith("USDT") && !t.symbol.includes("_"),
                )
                .sort(
                    (a, b) =>
                        parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume),
                );
            setFuturesAssets(
                allUSDT.map(binanceService.transformFuturesTicker),
            );
        } catch (err) {
            console.error(
                "[MarketProvider] Failed to fetch futures assets:",
                err,
            );
        } finally {
            setIsFuturesLoading(false);
        }
    }, []);

    // ── Polling (both markets refresh every 30s) ─────────────────────────────────
    useEffect(() => {
        fetchSpotAssets();
        const timer = setInterval(fetchSpotAssets, 30_000);
        return () => clearInterval(timer);
    }, [fetchSpotAssets]);

    useEffect(() => {
        fetchFuturesAssets();
        const timer = setInterval(fetchFuturesAssets, 30_000);
        return () => clearInterval(timer);
    }, [fetchFuturesAssets]);

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
