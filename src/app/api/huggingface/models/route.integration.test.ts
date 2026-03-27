import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/getHuggingFaceKey", () => ({
    getHuggingFaceKey: vi.fn(async () => {
        throw new Error("missing");
    }),
}));

describe("GET /api/huggingface/models", () => {
    it("returns 401 when key is missing", async () => {
        const { GET } = await import("./route");
        const res = await GET(
            new Request("http://localhost/api/huggingface/models"),
        );
        expect(res.status).toBe(401);
    });

    it("normalizes upstream response shape to { data }", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    models: [{ id: "m2", name: "B" }, { id: "m1", name: "A" }],
                }),
                { status: 200 },
            ),
        ) as typeof global.fetch;

        const { GET } = await import("./route");
        const res = await GET(
            new Request("http://localhost/api/huggingface/models", {
                headers: { "x-huggingface-api-key": "key" },
            }),
        );
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.data[0].id).toBe("m1");
        global.fetch = originalFetch;
    });
});
