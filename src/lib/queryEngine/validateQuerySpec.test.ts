import { expect, it } from "vitest";

import { validateQuerySpecUnknown } from "./validateQuerySpec";

it("validateQuerySpecUnknown accepts a minimal simple spec", () => {
    const raw = {
        mode: "simple",
        intent: "tokenAddress",
        tokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };

    const out = validateQuerySpecUnknown(raw);
    expect(out.ok).toBe(true);
    if (out.ok) {
        expect(out.spec.mode).toBe("simple");
        expect(out.spec.intent).toBe("tokenAddress");
        expect(out.spec.tokenAddress).toBe(raw.tokenAddress);
    }
});

it("validateQuerySpecUnknown rejects invalid screening op/value", () => {
    const raw = {
        mode: "filtering",
        intent: "tokenAddress",
        tokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        screening: {
            fdv: { op: "wrong", valueUsd: 100 },
        },
    };

    const out = validateQuerySpecUnknown(raw);
    expect(out.ok).toBe(false);
    if (out.ok === false) {
        expect(out.errors.join(" ")).toContain("fdv");
    }
});

