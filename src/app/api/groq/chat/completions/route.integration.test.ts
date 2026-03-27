import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/getGroqKey", () => ({
    getGroqApiKey: vi.fn(async () => {
        throw new Error("missing");
    }),
}));

describe("POST /api/groq/chat/completions", () => {
    it("returns 400 when model is missing", async () => {
        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/groq/chat/completions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "user", content: "x" }] }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("returns upstream error status and details", async () => {
        global.fetch = vi.fn(async () => new Response("upstream fail", { status: 502 })) as typeof global.fetch;
        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/groq/chat/completions", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-groq-api-key": "k",
            },
            body: JSON.stringify({
                model: "m",
                messages: [{ role: "user", content: "x" }],
            }),
        });
        const res = await POST(req);
        const body = await res.json();
        expect(res.status).toBe(502);
        expect(body.error).toContain("Groq chat error: 502");
    });
});
