import { describe, expect, it, vi } from "vitest";

import type { QuerySpec } from "../lib/queryEngine/types";

vi.mock("./dexScreenerService", () => ({
    searchTokenPairsAcrossChains: vi.fn(),
}));

import { executeQueryV1 } from "./queryEngineService";
import { searchTokenPairsAcrossChains } from "./dexScreenerService";

describe("queryEngineService", () => {
    it("returns warning when tokenAddress is missing", async () => {
        const spec = {
            mode: "filtering",
            intent: "unknown",
        } as QuerySpec;
        const out = await executeQueryV1(spec);
        expect(out.matches).toEqual([]);
        expect(out.warnings.length).toBeGreaterThan(0);
    });

    it("applies numeric filters and sorts by score", async () => {
        vi.mocked(searchTokenPairsAcrossChains).mockResolvedValue({
            pairs: [
                {
                    chainId: "eth",
                    pairAddress: "0x1",
                    liquidityUsd: 1000,
                    volumeUsdH24: 100,
                    fdvUsd: 10000,
                    marketCapUsd: null,
                    priceChangeH24Pct: 1,
                },
                {
                    chainId: "base",
                    pairAddress: "0x2",
                    liquidityUsd: 5000,
                    volumeUsdH24: 500,
                    fdvUsd: 9000,
                    marketCapUsd: null,
                    priceChangeH24Pct: 5,
                },
            ],
            rawCount: 2,
        } as any);

        const spec = {
            mode: "filtering",
            intent: "tokenAddress",
            tokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            screening: {
                fdv: { op: "lt", valueUsd: 9500 },
            },
        } as QuerySpec;

        const out = await executeQueryV1(spec);
        expect(out.filteredCount).toBe(1);
        expect(out.matches[0].pairAddress).toBe("0x2");
    });
});
