import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/getGroqKey", () => ({
    getGroqApiKey: vi.fn(async () => {
        throw new Error("missing");
    }),
}));

describe("GET /api/groq/models", () => {
    it("returns 401 when no key can be resolved", async () => {
        const { GET } = await import("./route");
        const res = await GET(new Request("http://localhost/api/groq/models"));
        expect(res.status).toBe(401);
    });

    it("returns 200 when upstream call succeeds with header key", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })) as typeof global.fetch;
        const { GET } = await import("./route");
        const res = await GET(
            new Request("http://localhost/api/groq/models", {
                headers: { "x-groq-api-key": "k" },
            }),
        );
        expect(res.status).toBe(200);
        global.fetch = originalFetch;
    });
});
