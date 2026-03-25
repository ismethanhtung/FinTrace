import assert from "node:assert/strict";
import test from "node:test";

import { validateQuerySpecUnknown } from "./validateQuerySpec";

test("validateQuerySpecUnknown accepts a minimal simple spec", () => {
    const raw = {
        mode: "simple",
        intent: "tokenAddress",
        tokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };

    const out = validateQuerySpecUnknown(raw);
    assert.equal(out.ok, true);
    if (out.ok) {
        assert.equal(out.spec.mode, "simple");
        assert.equal(out.spec.intent, "tokenAddress");
        assert.equal(out.spec.tokenAddress, raw.tokenAddress);
    }
});

test("validateQuerySpecUnknown rejects invalid screening op/value", () => {
    const raw = {
        mode: "filtering",
        intent: "tokenAddress",
        tokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        screening: {
            fdv: { op: "wrong", valueUsd: 100 },
        },
    };

    const out = validateQuerySpecUnknown(raw);
    assert.equal(out.ok, false);
    if (!out.ok) {
        assert.ok(out.errors.join(" ").includes("fdv"));
    }
});

