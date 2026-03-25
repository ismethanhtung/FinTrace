import assert from "node:assert/strict";
import test from "node:test";

import {
    parseDexScreenerSearchResponse,
    type DexScreenerSearchResponse,
} from "./dexScreenerService";

test("parseDexScreenerSearchResponse parses pairs[].liquidity.usd and volume.h24", () => {
    const raw = {
        pairs: [
            {
                chainId: "base",
                pairAddress: "0xpair1",
                url: "https://example/pair1",
                baseToken: { symbol: "ABC", address: "0xtoken", name: "ABC" },
                quoteToken: { symbol: "WETH", address: "0xquote" },
                priceUsd: "0.12",
                liquidity: { usd: "123456.78" },
                volume: { h24: "98765.43" },
                fdv: "1000000",
                marketCap: null,
                priceChange: { h24: "-12.34" },
            },
            {
                chainId: "base",
                pairAddress: "0xpair1",
                // duplicate pairAddress to test de-dup
                baseToken: { symbol: "ABC" },
                liquidity: { usd: "999" },
            },
        ],
    };

    const out: DexScreenerSearchResponse = parseDexScreenerSearchResponse(raw);
    assert.equal(out.rawCount, 2);
    assert.equal(out.pairs.length, 1);

    const p = out.pairs[0];
    assert.equal(p.chainId, "base");
    assert.equal(p.pairAddress, "0xpair1");
    assert.equal(p.baseToken.symbol, "ABC");
    assert.equal(p.priceUsd, 0.12);
    assert.equal(p.liquidityUsd, 123456.78);
    assert.equal(p.volumeUsdH24, 98765.43);
    assert.equal(p.fdvUsd, 1000000);
    assert.equal(p.priceChangeH24Pct, -12.34);
});

