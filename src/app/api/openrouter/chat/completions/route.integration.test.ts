import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/getOpenRouterKey", () => ({
    getOpenRouterApiKey: vi.fn(async () => {
        throw new Error("missing");
    }),
}));

describe("POST /api/openrouter/chat/completions", () => {
    it("returns 400 for invalid JSON body", async () => {
        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/openrouter/chat/completions", {
            method: "POST",
            body: "not-json",
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("returns 401 when no API key from header and env", async () => {
        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/openrouter/chat/completions", {
            method: "POST",
            body: JSON.stringify({
                model: "m",
                messages: [{ role: "user", content: "hi" }],
            }),
            headers: { "content-type": "application/json" },
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it("proxies successful non-stream response", async () => {
        global.fetch = vi.fn(async () =>
            new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
                status: 200,
                headers: { "content-type": "application/json" },
            }),
        ) as typeof global.fetch;

        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/openrouter/chat/completions", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-openrouter-api-key": "key",
            },
            body: JSON.stringify({
                model: "m",
                messages: [{ role: "user", content: "hi" }],
            }),
        });
        const res = await POST(req);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.choices[0].message.content).toBe("ok");
    });
});
