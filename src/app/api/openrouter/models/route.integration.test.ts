import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/getOpenRouterKey", () => ({
    getOpenRouterApiKey: vi.fn(async () => {
        throw new Error("missing");
    }),
}));

describe("GET /api/openrouter/models", () => {
    it("returns 401 when no API key is available", async () => {
        const { GET } = await import("./route");
        const req = new Request("http://localhost/api/openrouter/models");
        const res = await GET(req);
        expect(res.status).toBe(401);
    });

    it("returns upstream payload when key provided in header", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })) as typeof global.fetch;

        const { GET } = await import("./route");
        const req = new Request("http://localhost/api/openrouter/models", {
            headers: { "x-openrouter-api-key": "key" },
        });
        const res = await GET(req);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(Array.isArray(body.data)).toBe(true);
        global.fetch = originalFetch;
    });
});
