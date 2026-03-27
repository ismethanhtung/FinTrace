import { expect, it } from "vitest";

import {
    parseDexScreenerSearchResponse,
    type DexScreenerSearchResponse,
} from "./dexScreenerService";

it("parseDexScreenerSearchResponse parses pairs[].liquidity.usd and volume.h24", () => {
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
    expect(out.rawCount).toBe(2);
    expect(out.pairs.length).toBe(1);

    const p = out.pairs[0];
    expect(p.chainId).toBe("base");
    expect(p.pairAddress).toBe("0xpair1");
    expect(p.baseToken.symbol).toBe("ABC");
    expect(p.priceUsd).toBe(0.12);
    expect(p.liquidityUsd).toBe(123456.78);
    expect(p.volumeUsdH24).toBe(98765.43);
    expect(p.fdvUsd).toBe(1000000);
    expect(p.priceChangeH24Pct).toBe(-12.34);
});

