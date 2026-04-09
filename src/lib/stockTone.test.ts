import { describe, expect, it } from "vitest";
import { resolveStockTone } from "./stockTone";

describe("resolveStockTone", () => {
    it("returns amber when price/ref are missing", () => {
        expect(resolveStockTone(Number.NaN, Number.NaN, Number.NaN, Number.NaN)).toBe(
            "amber",
        );
    });

    it("returns emerald/rose from ref comparison", () => {
        expect(resolveStockTone(12, 10, Number.NaN, Number.NaN)).toBe("emerald");
        expect(resolveStockTone(8, 10, Number.NaN, Number.NaN)).toBe("rose");
    });

    it("prioritizes ceiling and floor tone", () => {
        expect(resolveStockTone(15, 10, 15, 5)).toBe("fuchsia");
        expect(resolveStockTone(5, 10, 15, 5)).toBe("cyan");
    });
});
