import { describe, expect, it } from "vitest";

import {
    buildBinanceLogoCatalog,
    getCachedBinanceMarketingSymbols,
    resetTokenLogoServiceForTests,
    resolveBinanceLogoUrl,
    toSafeLogoUrl,
    type BinanceMarketingSymbolEntry,
} from "./tokenLogoService";

const SAMPLE_ENTRIES: BinanceMarketingSymbolEntry[] = [
    {
        symbol: "BTCUSDT",
        baseAsset: "BTC",
        quoteAsset: "USDT",
        logo: "https://img.test/btc.png",
        hidden: 0,
    },
    {
        symbol: "DOGEBTC",
        baseAsset: "DOGE",
        quoteAsset: "BTC",
        logo: "https://img.test/doge-btc.png",
        hidden: 0,
    },
    {
        symbol: "DOGEUSDT",
        baseAsset: "DOGE",
        quoteAsset: "USDT",
        logo: "https://img.test/doge-usdt.png",
        hidden: 0,
    },
    {
        symbol: "1000SATSUSDT",
        baseAsset: "1000SATS",
        quoteAsset: "USDT",
        logo: "https://img.test/1000sats.png",
        hidden: 0,
    },
];

describe("tokenLogoService", () => {
it("resolveBinanceLogoUrl matches exact trading symbol", () => {
    const catalog = buildBinanceLogoCatalog(SAMPLE_ENTRIES);

    const logoUrl = resolveBinanceLogoUrl(
        { id: "BTCUSDT", symbol: "BTC" },
        catalog,
    );

    expect(logoUrl).toBe("https://img.test/btc.png");
});

it("resolveBinanceLogoUrl falls back from futures id to base asset", () => {
    const catalog = buildBinanceLogoCatalog(SAMPLE_ENTRIES);

    const logoUrl = resolveBinanceLogoUrl(
        { id: "DOGEUSDT_PERP", symbol: "DOGE" },
        catalog,
    );

    expect(logoUrl).toBe("https://img.test/doge-usdt.png");
});

it("resolveBinanceLogoUrl preserves exact multiplier assets", () => {
    const catalog = buildBinanceLogoCatalog(SAMPLE_ENTRIES);

    const logoUrl = resolveBinanceLogoUrl(
        { id: "1000SATSUSDT", symbol: "1000SATS" },
        catalog,
    );

    expect(logoUrl).toBe("https://img.test/1000sats.png");
});

it("buildBinanceLogoCatalog prefers the stronger USDT candidate", () => {
    const catalog = buildBinanceLogoCatalog([
        {
            symbol: "DOGEBTC",
            baseAsset: "DOGE",
            quoteAsset: "BTC",
            logo: "https://img.test/doge-btc.png",
            hidden: 0,
        },
        {
            symbol: "DOGEUSDT",
            baseAsset: "DOGE",
            quoteAsset: "USDT",
            logo: "https://img.test/doge-usdt.png",
            hidden: 0,
        },
    ]);

    const logoUrl = resolveBinanceLogoUrl(
        { id: "DOGEUSDT_PERP", symbol: "DOGE" },
        catalog,
    );

    expect(logoUrl).toBe("https://img.test/doge-usdt.png");
});

it("resolveBinanceLogoUrl can fall back to mapperName", () => {
    const catalog = buildBinanceLogoCatalog([
        {
            symbol: "RENUSDT",
            baseAsset: "REN",
            quoteAsset: "USDT",
            logo: "https://img.test/ren.png",
            mapperName: "REPUBLIC",
            hidden: 0,
        },
    ]);

    const logoUrl = resolveBinanceLogoUrl(
        { id: "REPUBLICUSDT_PERP", symbol: "REPUBLIC" },
        catalog,
    );

    expect(logoUrl).toBe("https://img.test/ren.png");
});

it("toSafeLogoUrl proxies Binance CDN URLs through same-origin route", () => {
    const logoUrl = toSafeLogoUrl(
        "https://bin.bnbstatic.com/image/admin_mgs_image_upload/example.png",
    );

    expect(logoUrl).toBe(
        "/api/binance/logo?url=https%3A%2F%2Fbin.bnbstatic.com%2Fimage%2Fadmin_mgs_image_upload%2Fexample.png",
    );
});

it("getCachedBinanceMarketingSymbols deduplicates concurrent fetches", async () => {
    resetTokenLogoServiceForTests();

    const originalFetch = global.fetch;
    let fetchCount = 0;

    global.fetch = async () => {
        fetchCount += 1;
        return new Response(JSON.stringify(SAMPLE_ENTRIES), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    };

    try {
        const [first, second] = await Promise.all([
            getCachedBinanceMarketingSymbols(),
            getCachedBinanceMarketingSymbols(),
        ]);

        expect(fetchCount).toBe(1);
        expect(first).toEqual(SAMPLE_ENTRIES);
        expect(second).toEqual(SAMPLE_ENTRIES);
    } finally {
        global.fetch = originalFetch;
        resetTokenLogoServiceForTests();
    }
});
});
