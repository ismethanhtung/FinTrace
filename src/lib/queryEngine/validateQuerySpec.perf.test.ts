import { describe, expect, it } from "vitest";

import { validateQuerySpecUnknown } from "./validateQuerySpec";

describe("queryEngine perf smoke", () => {
    it("validates 10k query specs within a bounded time", () => {
        const sample = {
            mode: "filtering",
            intent: "tokenAddress",
            tokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            screening: {
                fdv: { op: "lt", valueUsd: 50_000_000 },
            },
        };

        const start = performance.now();
        for (let i = 0; i < 10_000; i += 1) {
            const result = validateQuerySpecUnknown(sample);
            expect(result.ok).toBe(true);
        }
        const elapsedMs = performance.now() - start;

        // Soft threshold for CI environments.
        expect(elapsedMs).toBeLessThan(2_000);
    });
});
