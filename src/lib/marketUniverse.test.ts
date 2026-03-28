import { describe, expect, it } from "vitest";
import {
    isMockUniverse,
    normalizeUniverse,
    resolveUniverseSwitchPath,
} from "./marketUniverse";

describe("marketUniverse", () => {
    it("normalizes unknown values to coin", () => {
        expect(normalizeUniverse("x")).toBe("coin");
        expect(normalizeUniverse("coin")).toBe("coin");
        expect(normalizeUniverse("stock")).toBe("stock");
    });

    it("keeps same path for supported routes and falls back for unsupported", () => {
        expect(resolveUniverseSwitchPath("/market")).toBe("/market");
        expect(resolveUniverseSwitchPath("/news")).toBe("/news");
        expect(resolveUniverseSwitchPath("/unknown-route")).toBe("/market");
    });

    it("marks stock as mock universe", () => {
        expect(isMockUniverse("coin")).toBe(false);
        expect(isMockUniverse("stock")).toBe(true);
    });
});

