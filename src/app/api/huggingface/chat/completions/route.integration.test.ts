import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/getHuggingFaceKey", () => ({
    getHuggingFaceKey: vi.fn(async () => {
        throw new Error("missing");
    }),
}));

describe("POST /api/huggingface/chat/completions", () => {
    it("returns 401 when no key is available", async () => {
        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/huggingface/chat/completions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                model: "m",
                messages: [{ role: "user", content: "x" }],
            }),
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it("returns upstream payload when success", async () => {
        global.fetch = vi.fn(async () =>
            new Response(JSON.stringify({ choices: [{ message: { content: "hf" } }] }), {
                status: 200,
                headers: { "content-type": "application/json" },
            }),
        ) as typeof global.fetch;

        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/huggingface/chat/completions", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-huggingface-api-key": "hf_xxx",
            },
            body: JSON.stringify({
                model: "m",
                messages: [{ role: "user", content: "x" }],
            }),
        });
        const res = await POST(req);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.choices[0].message.content).toBe("hf");
    });
});
