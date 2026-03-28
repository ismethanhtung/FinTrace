import { describe, expect, it } from "vitest";
import {
    createMockStockAssets,
    createMockStockChart,
    createMockStockTradeTape,
} from "./mockStockData";

describe("mockStockData", () => {
    it("creates deterministic mock stock assets", () => {
        const a = createMockStockAssets("spot");
        const b = createMockStockAssets("spot");
        expect(a.length).toBeGreaterThan(20);
        expect(a[0].id).toBe(b[0].id);
        expect(a[0].price).toBe(b[0].price);
        expect(a.every((x) => x.isMock)).toBe(true);
    });

    it("creates chart points with requested length", () => {
        const points = createMockStockChart("AAPL-C", 60_000, 300);
        expect(points).toHaveLength(300);
        expect(points[0].timestamp).toBeLessThan(points[299].timestamp);
    });

    it("creates trade tape in descending recent order by generation", () => {
        const trades = createMockStockTradeTape("AAPL-C", 80);
        expect(trades).toHaveLength(80);
        expect(trades[0].time).toBeGreaterThan(trades[79].time);
    });
});

