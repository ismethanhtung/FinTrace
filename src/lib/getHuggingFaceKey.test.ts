import { beforeEach, describe, expect, it, vi } from "vitest";

describe("getHuggingFaceKey", () => {
    beforeEach(() => {
        vi.resetModules();
        delete process.env.HUGGINGFACE_FALLBACK_API_KEY;
        delete process.env.HUGGINGFACE_API_KEY;
        delete process.env.HF_TOKEN;
        delete process.env.AWS_REGION;
    });

    it("uses fallback env key first", async () => {
        process.env.HUGGINGFACE_FALLBACK_API_KEY = "hf_xxx_real";
        const mod = await import("./getHuggingFaceKey");
        await expect(mod.getHuggingFaceKey()).resolves.toBe("hf_xxx_real");
    });

    it("uses HF_TOKEN when other keys are absent", async () => {
        process.env.HF_TOKEN = "hf_token_live";
        const mod = await import("./getHuggingFaceKey");
        await expect(mod.getHuggingFaceKey()).resolves.toBe("hf_token_live");
    });

    it("rejects when no key source is configured", async () => {
        const mod = await import("./getHuggingFaceKey");
        await expect(mod.getHuggingFaceKey()).rejects.toThrow(
            "HUGGINGFACE_FALLBACK_API_KEY is not set",
        );
    });
});
