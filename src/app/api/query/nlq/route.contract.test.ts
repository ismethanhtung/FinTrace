import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/getOpenRouterKey", () => ({
    getOpenRouterApiKey: vi.fn(async () => "test-key"),
}));

describe("POST /api/query/nlq contract", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns 400 for missing text", async () => {
        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/query/nlq", {
            method: "POST",
            body: JSON.stringify({}),
            headers: { "Content-Type": "application/json" },
        });
        const res = await POST(req);
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toContain("Missing `text`");
    });

    it("falls back to deterministic spec for non-openrouter provider", async () => {
        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/query/nlq", {
            method: "POST",
            body: JSON.stringify({
                text: "check wallet 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                mode: "wallet",
                provider: "groq",
            }),
            headers: { "Content-Type": "application/json" },
        });
        const res = await POST(req);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.fallback).toBe(true);
        expect(body.spec.intent).toBe("walletAddress");
    });

    it("returns validated model spec when provider response is valid", async () => {
        global.fetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    choices: [
                        {
                            message: {
                                content: JSON.stringify({
                                    mode: "simple",
                                    intent: "tokenAddress",
                                    tokenAddress:
                                        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                                }),
                            },
                        },
                    ],
                }),
                { status: 200 },
            ),
        ) as typeof global.fetch;

        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/query/nlq", {
            method: "POST",
            body: JSON.stringify({
                text: "analyze token 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                provider: "openrouter",
                mode: "simple",
            }),
            headers: { "Content-Type": "application/json" },
        });
        const res = await POST(req);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.spec.mode).toBe("simple");
        expect(body.spec.intent).toBe("tokenAddress");

        global.fetch = originalFetch;
    });
});
