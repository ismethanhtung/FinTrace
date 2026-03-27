import { describe, expect, it } from "vitest";

describe("E2E smoke - critical API flows", () => {
    it("news endpoint returns client-safe error contract without symbol", async () => {
        const { GET } = await import("../../src/app/api/news/route");
        const res = await GET(new Request("http://localhost/api/news"));
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(typeof body.error).toBe("string");
    });

    it("nlq endpoint returns fallback contract when provider is non-openrouter", async () => {
        const { POST } = await import("../../src/app/api/query/nlq/route");
        const req = new Request("http://localhost/api/query/nlq", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: "wallet 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                mode: "wallet",
                provider: "groq",
            }),
        });
        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.fallback).toBe(true);
        expect(body.spec.mode).toBe("wallet");
        expect(body.spec.intent).toBe("walletAddress");
    });

    it("utils cn merges classes for UI callsites", async () => {
        const { cn } = await import("../../src/lib/utils");
        expect(cn("p-2", "p-4", false && "hidden", "text-white")).toBe(
            "p-4 text-white",
        );
    });
});
