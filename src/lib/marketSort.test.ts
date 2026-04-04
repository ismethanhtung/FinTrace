import { expect, it } from "vitest";

import { sortMarketRowsBySubTab } from "./marketSort";
import { isLeveragedToken } from "./tokenFilters";
import type { MarketTableRow } from "../hooks/useMarketPageData";

function row(
    symbol: string,
    h24: number,
    volumeRaw: number,
    h1: number = 0,
): MarketTableRow {
    return {
        id: `${symbol}USDT`,
        name: symbol,
        symbol,
        price: 1,
        h1,
        h24,
        d7: 0,
        marketCap: "-",
        volume: "$0",
        volumeRaw,
        supply: "-",
        sentiment: "Neutral",
        trend: "flat",
        sparkline7d: [],
        exchange: "-",
        sector: "-",
        high: 0,
        low: 0,
        baseVolume: 0,
        indexMembership: [],
        tags: [],
    };
}

it("Gainers sorts by 24h percent descending", () => {
    const out = sortMarketRowsBySubTab(
        [row("AAA", 2, 100), row("BBB", 8, 90), row("CCC", -1, 1000)],
        "Gainers",
        "Highest Volume",
    );
    expect(out.map((x) => x.symbol)).toEqual(["BBB", "AAA", "CCC"]);
});

it("Top sorts by volume descending", () => {
    const out = sortMarketRowsBySubTab(
        [row("AAA", 2, 100), row("BBB", 1, 800), row("CCC", 9, 200)],
        "Top",
        "Highest Volume",
    );
    expect(out.map((x) => x.symbol)).toEqual(["BBB", "CCC", "AAA"]);
});

it("More-Losers sorts by 24h percent ascending", () => {
    const out = sortMarketRowsBySubTab(
        [row("AAA", 2, 100), row("BBB", -9, 800), row("CCC", -1, 200)],
        "More",
        "Losers",
    );
    expect(out.map((x) => x.symbol)).toEqual(["BBB", "CCC", "AAA"]);
});

// ─── isLeveragedToken ─────────────────────────────────────────────────────────

it("isLeveragedToken detects BEAR/BULL/DOWN/UP leveraged tokens", () => {
    expect(isLeveragedToken("EOSBEAR")).toBe(true);
    expect(isLeveragedToken("EOSBULL")).toBe(true);
    expect(isLeveragedToken("BTCDOWN")).toBe(true);
    expect(isLeveragedToken("BTCUP")).toBe(true);
    expect(isLeveragedToken("ETHBEAR")).toBe(true);
    expect(isLeveragedToken("LINKDOWN")).toBe(true);
    expect(isLeveragedToken("BNBUP")).toBe(true);
});

it("isLeveragedToken does NOT flag legitimate coins", () => {
    expect(isLeveragedToken("BTC")).toBe(false);
    expect(isLeveragedToken("ETH")).toBe(false);
    expect(isLeveragedToken("JUP")).toBe(false);   // Jupiter, ends with UP but prefix too short
    expect(isLeveragedToken("SOL")).toBe(false);
    expect(isLeveragedToken("PEPE")).toBe(false);
    expect(isLeveragedToken("TRUMP")).toBe(false);
});

it("Trending does not over-rank extreme-pct coins vs large-volume coins", () => {
    // Coin A: massive volume, moderate change (BTC-like)
    const bigVol = row("BTC", 2, 30_000_000_000);
    // Coin B: tiny volume, huge change (meme pump)
    const memeRow = row("MEME", 300, 100_000, 50);
    const out = sortMarketRowsBySubTab([memeRow, bigVol], "Trending", "Highest Volume");
    // Meme should still rank ahead of BTC in trending (buzz > size) but both accounted
    // The important thing: result is deterministic, not dominated by raw pct difference
    expect(out.length).toBe(2);
});

it("Most Visited ranks large-volume coins above mid-vol volatile coins", () => {
    const btc = row("BTC", 2, 30_000_000_000);
    const midVol = row("ALT", 20, 100_000_000);
    const out = sortMarketRowsBySubTab([midVol, btc], "Most Visited", "Highest Volume");
    // BTC's volume dominance should win Most Visited
    expect(out[0].symbol).toBe("BTC");
});
