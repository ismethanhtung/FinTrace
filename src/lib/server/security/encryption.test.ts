import { describe, expect, it, beforeEach, vi } from "vitest";

describe("encryption", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.USER_SECRET_ENCRYPTION_KEY = "test-key-for-encryption-suite";
    });

    it("encrypts and decrypts round-trip", async () => {
        const { decryptSecret, encryptSecret } = await import("./encryption");
        const encrypted = encryptSecret("gsk_live_secret");
        const decrypted = decryptSecret(encrypted);
        expect(decrypted).toBe("gsk_live_secret");
    });

    it("fails when payload is tampered", async () => {
        const { decryptSecret, encryptSecret } = await import("./encryption");
        const encrypted = encryptSecret("hf_12345");
        encrypted.tag = Buffer.alloc(16, 7).toString("base64");
        expect(() => decryptSecret(encrypted)).toThrow();
    });
});
