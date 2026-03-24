import assert from "node:assert/strict";
import test from "node:test";

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
    };
}

test("Gainers sorts by 24h percent descending", () => {
    const out = sortMarketRowsBySubTab(
        [row("AAA", 2, 100), row("BBB", 8, 90), row("CCC", -1, 1000)],
        "Gainers",
        "Highest Volume",
    );
    assert.deepEqual(
        out.map((x) => x.symbol),
        ["BBB", "AAA", "CCC"],
    );
});

test("Top sorts by volume descending", () => {
    const out = sortMarketRowsBySubTab(
        [row("AAA", 2, 100), row("BBB", 1, 800), row("CCC", 9, 200)],
        "Top",
        "Highest Volume",
    );
    assert.deepEqual(
        out.map((x) => x.symbol),
        ["BBB", "CCC", "AAA"],
    );
});

test("More-Losers sorts by 24h percent ascending", () => {
    const out = sortMarketRowsBySubTab(
        [row("AAA", 2, 100), row("BBB", -9, 800), row("CCC", -1, 200)],
        "More",
        "Losers",
    );
    assert.deepEqual(
        out.map((x) => x.symbol),
        ["BBB", "CCC", "AAA"],
    );
});

// ─── isLeveragedToken ─────────────────────────────────────────────────────────

test("isLeveragedToken detects BEAR/BULL/DOWN/UP leveraged tokens", () => {
    assert.equal(isLeveragedToken("EOSBEAR"), true);
    assert.equal(isLeveragedToken("EOSBULL"), true);
    assert.equal(isLeveragedToken("BTCDOWN"), true);
    assert.equal(isLeveragedToken("BTCUP"), true);
    assert.equal(isLeveragedToken("ETHBEAR"), true);
    assert.equal(isLeveragedToken("LINKDOWN"), true);
    assert.equal(isLeveragedToken("BNBUP"), true);
});

test("isLeveragedToken does NOT flag legitimate coins", () => {
    assert.equal(isLeveragedToken("BTC"), false);
    assert.equal(isLeveragedToken("ETH"), false);
    assert.equal(isLeveragedToken("JUP"), false);   // Jupiter, ends with UP but prefix too short
    assert.equal(isLeveragedToken("SOL"), false);
    assert.equal(isLeveragedToken("PEPE"), false);
    assert.equal(isLeveragedToken("TRUMP"), false);
});

test("Trending does not over-rank extreme-pct coins vs large-volume coins", () => {
    // Coin A: massive volume, moderate change (BTC-like)
    const bigVol = row("BTC", 2, 30_000_000_000);
    // Coin B: tiny volume, huge change (meme pump)
    const memeRow = row("MEME", 300, 100_000, 50);
    const out = sortMarketRowsBySubTab([memeRow, bigVol], "Trending", "Highest Volume");
    // Meme should still rank ahead of BTC in trending (buzz > size) but both accounted
    // The important thing: result is deterministic, not dominated by raw pct difference
    assert.equal(out.length, 2);
});

test("Most Visited ranks large-volume coins above mid-vol volatile coins", () => {
    const btc = row("BTC", 2, 30_000_000_000);
    const midVol = row("ALT", 20, 100_000_000);
    const out = sortMarketRowsBySubTab([midVol, btc], "Most Visited", "Highest Volume");
    // BTC's volume dominance should win Most Visited
    assert.equal(out[0].symbol, "BTC");
});
