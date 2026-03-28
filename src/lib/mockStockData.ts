import type { OhlcvPoint, Asset, MarketType } from "../services/binanceService";

type Rand = () => number;

const STOCK_SYMBOLS = [
    "AAPL",
    "MSFT",
    "NVDA",
    "AMZN",
    "GOOGL",
    "META",
    "TSLA",
    "AMD",
    "NFLX",
    "CRM",
    "INTC",
    "AVGO",
    "QCOM",
    "ORCL",
    "ADBE",
    "UBER",
    "SHOP",
    "PYPL",
    "SQ",
    "PLTR",
    "SNOW",
    "COIN",
    "HOOD",
    "BABA",
    "SONY",
    "SAP",
    "V",
    "MA",
];

function hashCode(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function mulberry32(seed: number): Rand {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), t | 1);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

export function getMockStockBasePrice(symbol: string): number {
    const rand = mulberry32(hashCode(`stock:${symbol}`));
    const base = 25 + rand() * 480;
    return Number(base.toFixed(2));
}

export function createMockStockAssets(marketType: MarketType): Asset[] {
    return STOCK_SYMBOLS.map((symbol, idx) => {
        const rand = mulberry32(hashCode(`${symbol}:${marketType}:asset`));
        const base = getMockStockBasePrice(symbol);
        const pct = (rand() - 0.5) * 8;
        const price = Number((base * (1 + pct / 100)).toFixed(2));
        const change = Number((price - base).toFixed(2));
        const quoteVolumeRaw = Math.round((25_000_000 + rand() * 1_200_000_000) * 100) / 100;
        const high24h = Number((Math.max(base, price) * (1 + rand() * 0.03)).toFixed(2));
        const low24h = Number((Math.min(base, price) * (1 - rand() * 0.03)).toFixed(2));
        const baseVolume = quoteVolumeRaw / Math.max(1, price);
        const suffix = marketType === "futures" ? "F" : "C";
        const id = `${symbol}-${suffix}`;
        const marker = marketType === "futures" ? "MOCK DERIV" : "MOCK";

        return {
            id,
            symbol,
            name: `${symbol} [${marker}]`,
            price,
            change,
            changePercent: Number(pct.toFixed(2)),
            marketCap: "-",
            volume24h: `$${(quoteVolumeRaw / 1_000_000).toFixed(1)}M`,
            high24h,
            low24h,
            baseVolume,
            quoteVolumeRaw,
            sparkline: [],
            marketType,
            isMock: true,
        };
    }).sort((a, b) => b.quoteVolumeRaw - a.quoteVolumeRaw);
}

export function createMockStockChart(
    symbol: string,
    intervalMs: number,
    limit: number,
): OhlcvPoint[] {
    const base = getMockStockBasePrice(symbol);
    const rand = mulberry32(hashCode(`${symbol}:chart`));
    let prevClose = base;
    const end = Date.now();
    const out: OhlcvPoint[] = [];

    for (let i = limit - 1; i >= 0; i -= 1) {
        const ts = end - i * intervalMs;
        const drift = (rand() - 0.5) * 0.015;
        const open = prevClose;
        const close = Math.max(1, open * (1 + drift));
        const high = Math.max(open, close) * (1 + rand() * 0.008);
        const low = Math.min(open, close) * (1 - rand() * 0.008);
        const volume = 5000 + rand() * 160_000;

        out.push({
            time: "",
            timestamp: ts,
            open: Number(open.toFixed(2)),
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            close: Number(close.toFixed(2)),
            volume: Number(volume.toFixed(2)),
        });
        prevClose = close;
    }
    return out;
}

export function createMockStockTradeTape(symbol: string, limit: number): {
    id: number;
    price: number;
    qty: number;
    time: number;
    isBuy: boolean;
}[] {
    const base = getMockStockBasePrice(symbol);
    const rand = mulberry32(hashCode(`${symbol}:trades`));
    const now = Date.now();
    const out: { id: number; price: number; qty: number; time: number; isBuy: boolean }[] = [];

    for (let i = 0; i < limit; i += 1) {
        const drift = (rand() - 0.5) * 0.01;
        const price = Math.max(1, base * (1 + drift));
        const qty = 5 + rand() * 1800;
        out.push({
            id: i + 1,
            price: Number(price.toFixed(2)),
            qty: Number(qty.toFixed(2)),
            time: now - i * 1800,
            isBuy: rand() >= 0.5,
        });
    }
    return out;
}

