import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/getOpenRouterKey", () => ({
    getOpenRouterApiKey: vi.fn(async () => "ok"),
}));
vi.mock("../../../../lib/getGroqKey", () => ({
    getGroqApiKey: vi.fn(async () => {
        throw new Error("missing");
    }),
}));
vi.mock("../../../../lib/getHuggingFaceKey", () => ({
    getHuggingFaceKey: vi.fn(async () => "hf-ok"),
}));

describe("GET /api/ai/key-status", () => {
    it("returns boolean key status map", async () => {
        const { GET } = await import("./route");
        const res = await GET();
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.openrouter).toBe(true);
        expect(body.groq).toBe(false);
        expect(body.huggingface).toBe(true);
    });
});
