import { binanceService, type MarketType } from "../../services/binanceService";

export type MarketRowMetrics = {
    h1: number | null;
    d7: number | null;
    sparkline7d: { v: number }[];
};

function toPct(from: number, to: number): number | null {
    if (!isFinite(from) || !isFinite(to) || from <= 0) return null;
    return ((to - from) / from) * 100;
}

// Binance kline index 4 = close price
function klinesClosePrice(raw: any[]): { v: number }[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((k) => {
            const v = Number.parseFloat(k?.[4] ?? "");
            return Number.isFinite(v) ? { v } : null;
        })
        .filter((x): x is { v: number } => x !== null);
}

async function fetchSymbolKlines(
    marketType: MarketType,
    symbol: string,
    interval: string,
    limit: number,
) {
    if (marketType === "futures") {
        return binanceService.getFuturesKlines(symbol, interval, limit);
    }
    return binanceService.getKlines(symbol, interval, limit);
}

/**
 * Single Binance API call per symbol: 1H × 168 = 7 full days.
 * Derives h1%, d7%, and sparkline all from the same hourly kline data.
 */
export async function fetchMarketRowMetrics(
    marketType: MarketType,
    symbol: string,
): Promise<MarketRowMetrics> {
    try {
        const raw = await fetchSymbolKlines(marketType, symbol, "1H", 168);
        const points = klinesClosePrice(raw);

        if (points.length < 2) {
            return { h1: null, d7: null, sparkline7d: [] };
        }

        const last = points[points.length - 1].v;
        const prevHour = points[points.length - 2].v;
        const first = points[0].v;

        return {
            h1: toPct(prevHour, last),
            d7: toPct(first, last),
            sparkline7d: points,
        };
    } catch {
        return {
            h1: null,
            d7: null,
            sparkline7d: [],
        };
    }
}
