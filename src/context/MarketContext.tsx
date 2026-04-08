"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Asset,
    MarketType,
    binanceService,
} from "../services/binanceService";
import {
    mergeMiniTickerArray,
    subscribeSharedStream,
    type MarketMiniTicker,
    type MarketStreamStatus,
} from "../services/marketStreamService";
import { useUniverse } from "./UniverseContext";
import { stockLambdaMarketAdapter } from "../services/adapters/stockLambdaMarketAdapter";
import { stockLambdaService } from "../services/stockLambdaService";
import { type AssetUniverse } from "../lib/marketUniverse";
import { enrichAssetsWithLogos } from "../services/tokenLogoService";
import { enrichAssetsWithBinanceAssetMetadata } from "../services/binanceAssetMetadataService";
import { isLeveragedToken } from "../lib/tokenFilters";

const DEFAULT_SYMBOL_BY_UNIVERSE: Record<AssetUniverse, string> = {
    coin: "BTCUSDT",
    stock: "",
};
const STOCK_AUTO_HYDRATE_BATCH_SIZE = 25;
const STOCK_AUTO_HYDRATE_DELAY_MS = 120;
const COIN_BOOTSTRAP_ENRICH_TIMEOUT_MS = 2500;
const COIN_WS_RESORT_INTERVAL_MS = 3000;

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
    const lastSpotResortAtRef = useRef(0);
    const lastFuturesResortAtRef = useRef(0);

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
            let next: Asset[] = [];

            if (universe === "stock") {
                next = await stockLambdaMarketAdapter.listAssets("spot");
            } else {
                // Fast path for coins: show tickers ASAP, enrich later (don't block UI).
                const tickers = await binanceService.getTickers();
                next = tickers
                    .filter(
                        (t) =>
                            t.symbol.endsWith("USDT") &&
                            !isLeveragedToken(t.symbol.slice(0, -4)),
                    )
                    .sort(
                        (a, b) =>
                            parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume),
                    )
                    .map(binanceService.transformTicker);
            }

            if (mountedRef.current && requestSeq === spotRequestSeqRef.current) {
                setSpotAssets(next);
                setError(null);
            }

            // Background enrich for coin universe (logos + tags/metadata).
            if (universe !== "stock" && next.length) {
                const enrichSeq = requestSeq;
                const timer = window.setTimeout(() => {
                    // Prevent long-hanging enrich from delaying subsequent fast refreshes.
                }, COIN_BOOTSTRAP_ENRICH_TIMEOUT_MS);

                Promise.resolve()
                    .then(() => enrichAssetsWithLogos(next))
                    .then((withLogos) =>
                        enrichAssetsWithBinanceAssetMetadata(withLogos),
                    )
                    .then((enriched) => {
                        if (
                            mountedRef.current &&
                            enrichSeq === spotRequestSeqRef.current
                        ) {
                            setSpotAssets((prev) => {
                                // Merge enriched fields without losing fresher websocket prices.
                                const byId = new Map(
                                    prev.map((a) => [a.id, a] as const),
                                );
                                return enriched.map((a) => ({
                                    ...a,
                                    ...(byId.get(a.id) ?? {}),
                                    // Ensure enriched fields win when they exist.
                                    name: a.name,
                                    tags: a.tags,
                                    logoUrl: a.logoUrl,
                                    binanceAssetInfo: a.binanceAssetInfo,
                                }));
                            });
                        }
                    })
                    .catch((err) => {
                        console.warn("[MarketProvider] Coin enrich (spot) failed:", err);
                    })
                    .finally(() => window.clearTimeout(timer));
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
            let next: Asset[] = [];

            if (universe === "stock") {
                next = await stockLambdaMarketAdapter.listAssets("futures");
            } else {
                const tickers = await binanceService.getFuturesTickers();
                next = tickers
                    .filter(
                        (t) =>
                            t.symbol.endsWith("USDT") &&
                            !t.symbol.includes("_") &&
                            !isLeveragedToken(t.symbol.slice(0, -4)),
                    )
                    .sort(
                        (a, b) =>
                            parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume),
                    )
                    .map(binanceService.transformFuturesTicker);
            }
            if (
                mountedRef.current &&
                requestSeq === futuresRequestSeqRef.current
            ) {
                setFuturesAssets(next);
                setError(null);
            }

            if (universe !== "stock" && next.length) {
                const enrichSeq = requestSeq;
                const timer = window.setTimeout(() => {}, COIN_BOOTSTRAP_ENRICH_TIMEOUT_MS);

                Promise.resolve()
                    .then(() => enrichAssetsWithLogos(next))
                    .then((withLogos) =>
                        enrichAssetsWithBinanceAssetMetadata(withLogos),
                    )
                    .then((enriched) => {
                        if (
                            mountedRef.current &&
                            enrichSeq === futuresRequestSeqRef.current
                        ) {
                            setFuturesAssets((prev) => {
                                const byId = new Map(
                                    prev.map((a) => [a.id, a] as const),
                                );
                                return enriched.map((a) => ({
                                    ...a,
                                    ...(byId.get(a.id) ?? {}),
                                    name: a.name,
                                    tags: a.tags,
                                    logoUrl: a.logoUrl,
                                    binanceAssetInfo: a.binanceAssetInfo,
                                }));
                            });
                        }
                    })
                    .catch((err) => {
                        console.warn(
                            "[MarketProvider] Coin enrich (futures) failed:",
                            err,
                        );
                    })
                    .finally(() => window.clearTimeout(timer));
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
                    mergeMiniTickerArray(prev, payload, "spot", { resort: false }),
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
                    mergeMiniTickerArray(prev, payload, "futures", { resort: false }),
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

    // Resort by volume at a controlled cadence to avoid heavy sort cost per WS frame.
    useEffect(() => {
        if (!isHydrated) return;
        if (universe === "stock") return;
        if (!spotAssets.length) return;

        const id = window.setInterval(() => {
            const now = Date.now();
            if (now - lastSpotResortAtRef.current < COIN_WS_RESORT_INTERVAL_MS) return;
            lastSpotResortAtRef.current = now;
            setSpotAssets((prev) => {
                const next = [...prev];
                next.sort((a, b) => b.quoteVolumeRaw - a.quoteVolumeRaw);
                return next;
            });
        }, COIN_WS_RESORT_INTERVAL_MS);

        return () => window.clearInterval(id);
    }, [isHydrated, spotAssets.length, universe]);

    useEffect(() => {
        if (!isHydrated) return;
        if (universe === "stock") return;
        if (!futuresAssets.length) return;

        const id = window.setInterval(() => {
            const now = Date.now();
            if (now - lastFuturesResortAtRef.current < COIN_WS_RESORT_INTERVAL_MS) return;
            lastFuturesResortAtRef.current = now;
            setFuturesAssets((prev) => {
                const next = [...prev];
                next.sort((a, b) => b.quoteVolumeRaw - a.quoteVolumeRaw);
                return next;
            });
        }, COIN_WS_RESORT_INTERVAL_MS);

        return () => window.clearInterval(id);
    }, [futuresAssets.length, isHydrated, universe]);

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
