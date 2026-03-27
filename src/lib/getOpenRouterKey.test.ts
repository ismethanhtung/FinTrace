import { beforeEach, describe, expect, it, vi } from "vitest";

describe("getOpenRouterApiKey", () => {
    beforeEach(() => {
        vi.resetModules();
        delete process.env.OPENROUTER_FALLBACK_API_KEY;
        delete process.env.AWS_REGION;
    });

    it("returns env key when provided", async () => {
        process.env.OPENROUTER_FALLBACK_API_KEY = "sk-or-v1-real-key";
        const mod = await import("./getOpenRouterKey");
        await expect(mod.getOpenRouterApiKey()).resolves.toBe("sk-or-v1-real-key");
    });

    it("rejects when env and AWS region are missing", async () => {
        const mod = await import("./getOpenRouterKey");
        await expect(mod.getOpenRouterApiKey()).rejects.toThrow(
            "OPENROUTER_FALLBACK_API_KEY is not set",
        );
    });

    it("ignores placeholder env values and still rejects without AWS", async () => {
        process.env.OPENROUTER_FALLBACK_API_KEY = "YOUR_KEY_HERE";
        const mod = await import("./getOpenRouterKey");
        await expect(mod.getOpenRouterApiKey()).rejects.toThrow("AWS_REGION");
    });
});
