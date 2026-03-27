import { beforeEach, describe, expect, it, vi } from "vitest";

describe("getGroqApiKey", () => {
    beforeEach(() => {
        vi.resetModules();
        delete process.env.GROQ_API_KEY;
        delete process.env.AWS_REGION;
    });

    it("returns env key when provided", async () => {
        process.env.GROQ_API_KEY = "gsk_live_key";
        const mod = await import("./getGroqKey");
        await expect(mod.getGroqApiKey()).resolves.toBe("gsk_live_key");
    });

    it("rejects when env and AWS region are missing", async () => {
        const mod = await import("./getGroqKey");
        await expect(mod.getGroqApiKey()).rejects.toThrow("GROQ_API_KEY is not set");
    });

    it("rejects placeholder env keys", async () => {
        process.env.GROQ_API_KEY = "MY_GROQ_KEY";
        const mod = await import("./getGroqKey");
        await expect(mod.getGroqApiKey()).rejects.toThrow("AWS_REGION");
    });
});
