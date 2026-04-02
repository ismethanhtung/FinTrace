"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMarket } from "../context/MarketContext";
import type { MarketType } from "../services/binanceService";
import { fetchMarketRowMetrics } from "../api/market/marketPageApi";
import { useUniverse } from "../context/UniverseContext";
import { stockLambdaService } from "../services/stockLambdaService";

export type Sentiment = "Positive" | "Negative" | "Neutral";
export type Trend = "up" | "down" | "flat";

export type MarketTableRow = {
    id: string;
    name: string;
    symbol: string;
    price: number;
    h1: number | null;
    h24: number;
    d7: number | null;
    marketCap: string;
    volume: string;
    volumeRaw: number;
    supply: string;
    sentiment: Sentiment;
    trend: Trend;
    sparkline7d: { v: number }[];
    logoUrl?: string;
    exchange: string;
    sector: string;
    high: number;
    low: number;
    baseVolume: number;
    indexMembership: string[];
};

type MarketStats = {
    marketCap: string;
    volume24h: string;
    btcDominance: string;
    advancers: number;
    decliners: number;
    unchanged: number;
    averageChange: number;
};

const METRIC_CACHE_TTL_MS = 2 * 60 * 1000;
const metricCache = new Map<
    string,
    {
        expiresAt: number;
        value: Awaited<ReturnType<typeof fetchMarketRowMetrics>>;
    }
>();

function formatCompactUsd(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return "-";
    if (value >= 1_000_000_000_000)
        return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (value >= 1_000_000_000)
        return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
}

function pickSentiment(h24: number): Sentiment {
    if (h24 > 1) return "Positive";
    if (h24 < -1) return "Negative";
    return "Neutral";
}

function pickTrend(d7: number): Trend {
    if (d7 > 0.1) return "up";
    if (d7 < -0.1) return "down";
    return "flat";
}

function applyMetricToRows(
    prevRows: MarketTableRow[],
    symbol: string,
    metric: Awaited<ReturnType<typeof fetchMarketRowMetrics>>,
): MarketTableRow[] {
    const next = prevRows.map((row) => {
        if (row.id !== symbol) return row;
        const d7 = metric.d7;
        return {
            ...row,
            h1: metric.h1,
            d7,
            trend: pickTrend(d7 ?? row.h24),
            sparkline7d: metric.sparkline7d,
        };
    });
    return next;
}

async function fetchMetricCached(
    marketType: MarketType,
    symbol: string,
): Promise<Awaited<ReturnType<typeof fetchMarketRowMetrics>>> {
    const key = `${marketType}:${symbol}`;
    const cached = metricCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = await fetchMarketRowMetrics(marketType, symbol);
    metricCache.set(key, {
        value,
        expiresAt: Date.now() + METRIC_CACHE_TTL_MS,
    });
    return value;
}

export function useMarketPageData() {
    const { universe } = useUniverse();
    const {
        marketType,
        assets,
        spotAssets,
        futuresAssets,
        isLoading,
        isFuturesLoading,
    } = useMarket();
    const [rows, setRows] = useState<MarketTableRow[]>([]);
    const [refreshSeed, setRefreshSeed] = useState(0);

    const currentLoading =
        marketType === "futures" ? isFuturesLoading : isLoading;
    const sourceAssets = marketType === "futures" ? futuresAssets : spotAssets;

    const stats: MarketStats = useMemo(() => {
        const totalQuoteVol = sourceAssets.reduce(
            (sum, a) => sum + (a.quoteVolumeRaw || 0),
            0,
        );
        const btc = sourceAssets.find((a) => a.id === "BTCUSDT");
        const btcDominance =
            totalQuoteVol > 0 && btc
                ? `${((btc.quoteVolumeRaw / totalQuoteVol) * 100).toFixed(2)}%`
                : "-";
        const changedAssets = sourceAssets.filter((a) =>
            Number.isFinite(a.changePercent),
        );
        const advancers = changedAssets.filter((a) => a.changePercent > 0).length;
        const decliners = changedAssets.filter((a) => a.changePercent < 0).length;
        const unchanged = Math.max(0, changedAssets.length - advancers - decliners);
        const averageChange = changedAssets.length
            ? changedAssets.reduce((sum, a) => sum + a.changePercent, 0) /
              changedAssets.length
            : 0;

        return {
            // Binance public 24h ticker does not include market cap.
            marketCap: "$???",
            volume24h: formatCompactUsd(totalQuoteVol),
            btcDominance,
            advancers,
            decliners,
            unchanged,
            averageChange,
        };
    }, [sourceAssets]);

    const refetch = useCallback(() => {
        setRefreshSeed((x) => x + 1);
    }, []);

    useEffect(() => {
        let mounted = true;

        async function run() {
            if (!assets.length) {
                if (mounted) setRows([]);
                return;
            }

            const baseRows: MarketTableRow[] = assets.map((asset) => ({
                id: asset.id,
                name: asset.name,
                symbol: asset.symbol,
                price: asset.price,
                h1: null,
                h24: asset.changePercent,
                d7: null,
                marketCap: "-",
                volume: formatCompactUsd(asset.quoteVolumeRaw),
                volumeRaw: asset.quoteVolumeRaw || 0,
                supply: "-",
                sentiment: pickSentiment(asset.changePercent),
                trend: pickTrend(asset.changePercent),
                sparkline7d: [],
                logoUrl: asset.logoUrl,
                exchange: asset.stockProfile?.exchange || "-",
                sector: asset.stockProfile?.sector || asset.stockProfile?.icbName || "-",
                high: asset.high24h || 0,
                low: asset.low24h || 0,
                baseVolume: asset.baseVolume || 0,
                indexMembership: asset.stockProfile?.indexMembership || [],
            }));

            // Render ngay dữ liệu lõi (price/24h/volume) để bảng lên cực nhanh.
            setRows(baseRows);

            // Enrich metric nền: ưu tiên 20 coin đầu trước, sau đó mới đến phần còn lại.
            const priority = baseRows.slice(0, 20).map((r) => r.id);
            const rest = baseRows.slice(20).map((r) => r.id);
            const symbols = [...priority, ...rest];
            const concurrency = 6;
            let cursor = 0;

            if (universe === "stock") {
                const symbols = baseRows.map((r) => r.id);
                const chunkSize = 80;
                const concurrency = 3;
                let stockCursor = 0;

                async function stockWorker() {
                    while (stockCursor < symbols.length && mounted) {
                        const start = stockCursor;
                        stockCursor += chunkSize;
                        const chunk = symbols.slice(start, start + chunkSize);
                        if (!chunk.length) return;

                        try {
                            const snapshotMap =
                                await stockLambdaService.getBulkSnapshots(
                                    chunk,
                                    marketType,
                                );
                            if (!mounted || snapshotMap.size === 0) continue;

                            setRows((prev) =>
                                prev.map((row) => {
                                    const next = snapshotMap.get(row.id);
                                    if (!next) return row;
                                    const h24 = next.changePercent;
                                    return {
                                        ...row,
                                        price: next.price,
                                        h24,
                                        high: next.high24h || row.high,
                                        low: next.low24h || row.low,
                                        volume: formatCompactUsd(
                                            next.quoteVolumeRaw,
                                        ),
                                        volumeRaw: next.quoteVolumeRaw || 0,
                                        baseVolume: next.baseVolume || 0,
                                        sentiment: pickSentiment(h24),
                                        trend: pickTrend(h24),
                                    };
                                }),
                            );
                        } catch {
                            // Keep rendering with any successful batches.
                        }
                    }
                }

                await Promise.all(
                    Array.from({ length: concurrency }, () => stockWorker()),
                );
                return;
            }

            async function worker() {
                while (cursor < symbols.length && mounted) {
                    const idx = cursor++;
                    const symbol = symbols[idx];
                    const metric = await fetchMetricCached(marketType, symbol);
                    if (!mounted) return;
                    setRows((prev) => applyMetricToRows(prev, symbol, metric));
                }
            }

            await Promise.all(
                Array.from({ length: concurrency }, () => worker()),
            );
        }

        run();
        return () => {
            mounted = false;
        };
    }, [assets, marketType, refreshSeed, universe]);

    return {
        rows,
        stats,
        isLoading: currentLoading,
        refetch,
    };
}
