import { describe, expect, it } from "vitest";
import { toUnifiedAsset } from "./marketDataAdapter";
import type { Asset } from "./binanceService";

describe("marketDataAdapter", () => {
    it("maps to unified asset with universe", () => {
        const input: Asset = {
            id: "AAPL-C",
            symbol: "AAPL",
            name: "AAPL",
            price: 100,
            change: 1,
            changePercent: 1,
            marketCap: "-",
            volume24h: "$1M",
            high24h: 101,
            low24h: 99,
            baseVolume: 1000,
            quoteVolumeRaw: 100_000,
            sparkline: [],
            marketType: "spot",
        };
        const out = toUnifiedAsset(input, "stock");
        expect(out.universe).toBe("stock");
        expect(out.id).toBe("AAPL-C");
    });
});
