import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_VERSION = 1;

export type EncryptedSecret = {
    keyVersion: number;
    iv: string;
    tag: string;
    ciphertext: string;
};

let cachedKey: Buffer | null = null;

function resolveRawKey(): string {
    const raw = process.env.USER_SECRET_ENCRYPTION_KEY;
    if (!raw || raw.trim().length === 0) {
        throw new Error("Missing USER_SECRET_ENCRYPTION_KEY environment variable");
    }
    return raw.trim();
}

function deriveKey(raw: string): Buffer {
    // Accept either base64-encoded 32-byte key or derive from passphrase.
    const asBase64 = Buffer.from(raw, "base64");
    if (asBase64.length === 32) return asBase64;
    return crypto.createHash("sha256").update(raw).digest();
}

function getKey(): Buffer {
    if (cachedKey) return cachedKey;
    cachedKey = deriveKey(resolveRawKey());
    return cachedKey;
}

export function encryptSecret(plainText: string): EncryptedSecret {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(plainText, "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
        keyVersion: KEY_VERSION,
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        ciphertext: encrypted.toString("base64"),
    };
}

export function decryptSecret(payload: EncryptedSecret): string {
    const decipher = crypto.createDecipheriv(
        ALGO,
        getKey(),
        Buffer.from(payload.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    const plain = Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, "base64")),
        decipher.final(),
    ]);
    return plain.toString("utf8");
}

export const secretEncryptionVersion = KEY_VERSION;
