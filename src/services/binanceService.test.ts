import { describe, expect, it, vi } from "vitest";

import {
    INTERVAL_LIMIT,
    binanceService,
    type BinanceTicker,
    type FuturesTicker,
} from "./binanceService";

describe("binanceService", () => {
    it("calls spot klines with mapped interval and default limit", async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
        global.fetch = fetchMock as typeof global.fetch;

        await binanceService.getKlines("BTCUSDT", "1H");

        const firstCall = fetchMock.mock.calls[0] as unknown[];
        const calledUrl = String(firstCall[0]);
        expect(calledUrl).toContain("interval=1h");
        expect(calledUrl).toContain(`limit=${INTERVAL_LIMIT["1H"]}`);
    });

    it("throws when futures depth API fails", async () => {
        global.fetch = vi.fn(async () => new Response("x", { status: 503 })) as typeof global.fetch;
        await expect(binanceService.getFuturesDepth("BTCUSDT")).rejects.toThrow(
            "Futures depth error: 503",
        );
    });

    it("maps kline payload to numeric OHLCV values", () => {
        const mapped = binanceService.mapKline([
            1000,
            "10.5",
            "11.1",
            "9.9",
            "10.8",
            "123.45",
        ]);

        expect(mapped.timestamp).toBe(1000);
        expect(mapped.open).toBe(10.5);
        expect(mapped.volume).toBe(123.45);
    });

    it("transforms spot ticker to Asset format", () => {
        const ticker: BinanceTicker = {
            symbol: "BTCUSDT",
            priceChange: "10",
            priceChangePercent: "2.5",
            lastPrice: "40000",
            volume: "100",
            quoteVolume: "4000000",
            highPrice: "41000",
            lowPrice: "39000",
            weightedAvgPrice: "40200",
        };
        const asset = binanceService.transformTicker(ticker);
        expect(asset.symbol).toBe("BTC");
        expect(asset.marketType).toBe("spot");
        expect(asset.volume24h).toBe("$4.0M");
    });

    it("transforms futures ticker to Asset format", () => {
        const ticker: FuturesTicker = {
            symbol: "ETHUSDT",
            priceChange: "5",
            priceChangePercent: "1.1",
            lastPrice: "3000",
            volume: "50",
            quoteVolume: "1500000",
            highPrice: "3050",
            lowPrice: "2950",
        };
        const asset = binanceService.transformFuturesTicker(ticker);
        expect(asset.symbol).toBe("ETH");
        expect(asset.marketType).toBe("futures");
        expect(asset.volume24h).toBe("$1.5M");
    });
});
