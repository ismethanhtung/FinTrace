import { describe, expect, it } from "vitest";
import {
    mapVietcapMarketIndexBySymbol,
    normalizeMarketIndexSymbol,
    toVietcapMarketIndexState,
} from "./marketIndex";

describe("vietcap market index mapper", () => {
    it("normalizes known symbols and aliases", () => {
        expect(normalizeMarketIndexSymbol("VNINDEX")).toBe("VNINDEX");
        expect(normalizeMarketIndexSymbol("HNXIndex")).toBe("HNXINDEX");
        expect(normalizeMarketIndexSymbol("HNXUpcomIndex")).toBe("UPCOM");
        expect(normalizeMarketIndexSymbol("VNXALL")).toBe("VNXALL");
    });

    it("maps row to normalized market index state", () => {
        const out = toVietcapMarketIndexState({
            symbol: "VNINDEX",
            board: "HSX",
            price: 1694.82,
            refPrice: 1702.93,
            change: -8.11,
            changePercent: -0.4762,
            totalShares: 888151216,
            totalValue: 27391519.51089,
            totalStockCeiling: 5,
            totalStockIncrease: 77,
            totalStockNoChange: 43,
            totalStockDecline: 242,
        });

        expect(out?.symbol).toBe("VNINDEX");
        expect(out?.value).toBe(1694.82);
        expect(out?.change).toBe(-8.11);
        expect(out?.totalShares).toBe(888151216);
        expect(out?.totalStockCeiling).toBe(5);
        expect(out?.totalStockDecline).toBe(242);
    });

    it("builds by-symbol map and keeps latest duplicate", () => {
        const out = mapVietcapMarketIndexBySymbol([
            { symbol: "HNXUpcomIndex", price: 99 },
            { symbol: "HNXUPCOMINDEX", price: 100 },
            { symbol: "UNKNOWN", price: 111 },
        ]);
        expect(Object.keys(out)).toEqual(["UPCOM"]);
        expect(out.UPCOM?.value).toBe(100);
    });
});
