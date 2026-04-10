import crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

const APP_NAME = "FinTrace";
const LOGIN_COOKIE_NAME = "ft_2fa_verified";
const LOGIN_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;
const SETUP_TTL_MS = 10 * 60 * 1000;

function readSecretKey(): string {
    return process.env.AUTH_SECRET || "fintrace-dev-auth-secret";
}

function base64UrlEncode(value: string): string {
    return Buffer.from(value, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
    const padded = value + "===".slice((value.length + 3) % 4);
    return Buffer.from(
        padded.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
    ).toString("utf8");
}

export function getTwoFactorLoginCookieName(): string {
    return LOGIN_COOKIE_NAME;
}

export function createTwoFactorLoginCookieValue(userId: string): string {
    const exp = Date.now() + LOGIN_COOKIE_TTL_SECONDS * 1000;
    const payload = `${userId}:${exp}`;
    const sig = crypto
        .createHmac("sha256", readSecretKey())
        .update(payload)
        .digest("hex");
    return base64UrlEncode(`${payload}:${sig}`);
}

export function verifyTwoFactorLoginCookieValue(
    value: string | undefined,
    userId: string,
): boolean {
    if (!value) return false;
    try {
        const decoded = base64UrlDecode(value);
        const [uid, expRaw, sig] = decoded.split(":");
        if (!uid || !expRaw || !sig) return false;
        if (uid !== userId) return false;
        const exp = Number(expRaw);
        if (!Number.isFinite(exp) || exp <= Date.now()) return false;
        const payload = `${uid}:${exp}`;
        const expectedSig = crypto
            .createHmac("sha256", readSecretKey())
            .update(payload)
            .digest("hex");
        return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
    } catch {
        return false;
    }
}

export function twoFactorLoginCookieMaxAgeSeconds(): number {
    return LOGIN_COOKIE_TTL_SECONDS;
}

export function createTotpSecret(): string {
    return generateSecret();
}

export function verifyTotpCode(secret: string, code: string): boolean {
    const normalized = code.trim().replace(/\s+/g, "");
    if (!/^\d{6}$/.test(normalized)) return false;
    return verifySync({
        secret,
        token: normalized,
    }).valid;
}

export function createTotpSetupPayload(args: {
    userId: string;
    email?: string | null;
    secret: string;
}): { otpauthUrl: string; manualKey: string; expiresAt: Date } {
    const accountName = args.email?.trim() || args.userId;
    const otpauthUrl = generateURI({
        issuer: APP_NAME,
        label: accountName,
        secret: args.secret,
    });
    return {
        otpauthUrl,
        manualKey: args.secret,
        expiresAt: new Date(Date.now() + SETUP_TTL_MS),
    };
}

export async function toQrDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 280,
    });
}

