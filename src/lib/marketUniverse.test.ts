import { describe, expect, it } from "vitest";
import {
    normalizeUniverse,
    resolveUniverseSwitchPath,
} from "./marketUniverse";

describe("marketUniverse", () => {
    it("normalizes unknown values to coin", () => {
        expect(normalizeUniverse("x")).toBe("coin");
        expect(normalizeUniverse("coin")).toBe("coin");
        expect(normalizeUniverse("stock")).toBe("stock");
    });

    it("maps shared market/board route by target universe", () => {
        expect(resolveUniverseSwitchPath("/market", "coin")).toBe("/market");
        expect(resolveUniverseSwitchPath("/market", "stock")).toBe("/board");
        expect(resolveUniverseSwitchPath("/board", "coin")).toBe("/market");
        expect(resolveUniverseSwitchPath("/board", "stock")).toBe("/board");
    });

    it("keeps supported routes and falls back by target universe", () => {
        expect(resolveUniverseSwitchPath("/news", "coin")).toBe("/news");
        expect(resolveUniverseSwitchPath("/news", "stock")).toBe("/news");
        expect(resolveUniverseSwitchPath("/unknown-route", "coin")).toBe(
            "/market",
        );
        expect(resolveUniverseSwitchPath("/unknown-route", "stock")).toBe(
            "/board",
        );
    });
});
