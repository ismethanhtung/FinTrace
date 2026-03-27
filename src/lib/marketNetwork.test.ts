import { describe, expect, it } from "vitest";

import {
    filterChipToNetworkKey,
    normalizeNetworks,
    resolveNetworksForSymbol,
    shouldKeepByNetwork,
} from "./marketNetwork";

describe("marketNetwork", () => {
    it("normalizeNetworks maps aliases and removes duplicates", () => {
        expect(
            normalizeNetworks(["Ethereum", "binance-smart-chain", "bsc", ""]),
        ).toEqual(["ethereum", "bsc"]);
    });

    it("filterChipToNetworkKey maps known chips and falls back to all", () => {
        expect(filterChipToNetworkKey("BSC")).toBe("bsc");
        expect(filterChipToNetworkKey("Highlights")).toBe("highlights");
        expect(filterChipToNetworkKey("Unknown")).toBe("all");
    });

    it("resolveNetworksForSymbol uses map first then fallback override", () => {
        expect(resolveNetworksForSymbol("abc", { ABC: ["base"] })).toEqual([
            "base",
        ]);
        expect(resolveNetworksForSymbol("USDT", {})).toEqual([
            "ethereum",
            "bsc",
            "solana",
            "base",
        ]);
        expect(resolveNetworksForSymbol("NOPE", {})).toEqual(["other"]);
    });

    it("shouldKeepByNetwork uses primary network for strict filters", () => {
        const map = { ETH: ["ethereum", "base"] };
        const primary = { ETH: "ethereum", ABC: "tron" };
        expect(shouldKeepByNetwork("Ethereum", "ETH", map, primary)).toBe(true);
        expect(shouldKeepByNetwork("Base", "ETH", map, primary)).toBe(false);
        expect(shouldKeepByNetwork("More", "ABC", map, primary)).toBe(true);
    });
});
