import { ObjectId } from "mongodb";
import { getDb } from "../../db/database";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";

function buildIdCandidates(userId: string): Array<string | ObjectId> {
    const candidates: Array<string | ObjectId> = [userId];
    if (ObjectId.isValid(userId)) {
        candidates.push(new ObjectId(userId));
    }
    return candidates;
}

function extractSessionTokenFromCookieHeader(cookieHeader: string | null): string | null {
    if (!cookieHeader) return null;
    const entries = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean);
    const cookies = new Map<string, string>();
    for (const entry of entries) {
        const eq = entry.indexOf("=");
        if (eq <= 0) continue;
        const key = entry.slice(0, eq).trim();
        const value = entry.slice(eq + 1).trim();
        cookies.set(key, decodeURIComponent(value));
    }
    return (
        cookies.get("__Secure-authjs.session-token") ||
        cookies.get("authjs.session-token") ||
        cookies.get("__Secure-next-auth.session-token") ||
        cookies.get("next-auth.session-token") ||
        null
    );
}

function sha256Base64Url(input: string): string {
    const b64 = crypto.createHash("sha256").update(input).digest("base64");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function readClientIp(req: { headers: Headers }): string {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    return "unknown";
}

function readCountry(req: { headers: Headers }): string | null {
    return (
        req.headers.get("cf-ipcountry") ||
        req.headers.get("x-vercel-ip-country") ||
        req.headers.get("x-country") ||
        null
    );
}

type SessionMetaDoc = {
    userId: string;
    sessionTokenHash: string;
    createdAt: Date;
    lastSeenAt: Date;
    ip: string;
    country?: string | null;
    userAgent: string;
    deviceType?: string;
    os?: string;
    browser?: string;
};

export async function revokeOtherSessions(params: {
    userId: string;
    cookieHeader: string | null;
}): Promise<{ revokedCount: number }> {
    const db = await getDb();
    const sessionToken = extractSessionTokenFromCookieHeader(params.cookieHeader);
    if (!sessionToken) {
        throw new Error("MISSING_SESSION_TOKEN");
    }
    const userIds = buildIdCandidates(params.userId);
    const result = await db.collection("sessions").deleteMany({
        userId: { $in: userIds },
        sessionToken: { $ne: sessionToken },
    });
    return { revokedCount: result.deletedCount ?? 0 };
}

export async function listActiveSessions(params: {
    userId: string;
    cookieHeader: string | null;
    requestHeaders: Headers;
}): Promise<
    Array<{
        sessionTokenHash: string;
        isCurrent: boolean;
        expires: string;
        createdAt?: string;
        lastSeenAt?: string;
        ip?: string;
        country?: string | null;
        deviceLabel: string;
        osLabel: string;
        browserLabel: string;
    }>
> {
    const db = await getDb();
    const currentToken = extractSessionTokenFromCookieHeader(params.cookieHeader);
    if (!currentToken) throw new Error("MISSING_SESSION_TOKEN");
    const userIds = buildIdCandidates(params.userId);

    const sessions = await db
        .collection<{ userId: unknown; sessionToken: string; expires: Date }>("sessions")
        .find({ userId: { $in: userIds } })
        .sort({ expires: -1 })
        .toArray();

    const currentHash = sha256Base64Url(currentToken);
    const now = new Date();

    // Upsert meta for current session using this request headers.
    const uaRaw = params.requestHeaders.get("user-agent") ?? "";
    const parsed = new UAParser(uaRaw).getResult();
    const deviceType = parsed.device.type || "desktop";
    const osLabel = [parsed.os.name, parsed.os.version].filter(Boolean).join(" ") || "Unknown OS";
    const browserLabel =
        [parsed.browser.name, parsed.browser.version].filter(Boolean).join(" ") ||
        "Unknown Browser";
    const deviceLabel =
        deviceType === "mobile"
            ? "Mobile"
            : deviceType === "tablet"
              ? "Tablet"
              : "Desktop";

    const metaCollection = db.collection<SessionMetaDoc>("session_meta");
    await metaCollection.updateOne(
        { userId: params.userId, sessionTokenHash: currentHash },
        {
            $set: {
                lastSeenAt: now,
                ip: readClientIp({ headers: params.requestHeaders }),
                country: readCountry({ headers: params.requestHeaders }),
                userAgent: uaRaw,
                deviceType,
                os: osLabel,
                browser: browserLabel,
            },
            $setOnInsert: {
                userId: params.userId,
                sessionTokenHash: currentHash,
                createdAt: now,
            },
        },
        { upsert: true },
    );

    const hashes = sessions.map((s) => sha256Base64Url(s.sessionToken));
    const metas = await metaCollection
        .find({ userId: params.userId, sessionTokenHash: { $in: hashes } })
        .toArray();
    const metaByHash = new Map(metas.map((m) => [m.sessionTokenHash, m]));

    return sessions.map((s) => {
        const hash = sha256Base64Url(s.sessionToken);
        const meta = metaByHash.get(hash);
        return {
            sessionTokenHash: hash,
            isCurrent: hash === currentHash,
            expires: s.expires.toISOString(),
            createdAt: meta?.createdAt?.toISOString(),
            lastSeenAt: meta?.lastSeenAt?.toISOString(),
            ip: meta?.ip,
            country: meta?.country ?? null,
            deviceLabel: meta?.deviceType
                ? meta.deviceType === "mobile"
                    ? "Mobile"
                    : meta.deviceType === "tablet"
                      ? "Tablet"
                      : "Desktop"
                : deviceLabel,
            osLabel: meta?.os ?? osLabel,
            browserLabel: meta?.browser ?? browserLabel,
        };
    });
}

export async function revokeSessionByHash(params: {
    userId: string;
    cookieHeader: string | null;
    targetSessionTokenHash: string;
}): Promise<{ revoked: boolean }> {
    const db = await getDb();
    const currentToken = extractSessionTokenFromCookieHeader(params.cookieHeader);
    if (!currentToken) throw new Error("MISSING_SESSION_TOKEN");
    const currentHash = sha256Base64Url(currentToken);
    if (params.targetSessionTokenHash === currentHash) {
        // Disallow revoking current session via this endpoint.
        return { revoked: false };
    }

    const userIds = buildIdCandidates(params.userId);
    const sessions = await db
        .collection<{ userId: unknown; sessionToken: string }>("sessions")
        .find({ userId: { $in: userIds } })
        .toArray();
    const match = sessions.find(
        (s) => sha256Base64Url(s.sessionToken) === params.targetSessionTokenHash,
    );
    if (!match) return { revoked: false };

    const deleted = await db.collection("sessions").deleteOne({
        userId: { $in: userIds },
        sessionToken: match.sessionToken,
    });
    if ((deleted.deletedCount ?? 0) > 0) {
        await db.collection("session_meta").deleteMany({
            userId: params.userId,
            sessionTokenHash: params.targetSessionTokenHash,
        });
        return { revoked: true };
    }
    return { revoked: false };
}

export async function deleteAccountAndData(userId: string): Promise<void> {
    const db = await getDb();
    const userIds = buildIdCandidates(userId);
    await db.collection("user_favorites").deleteMany({ userId: { $in: userIds } });
    await db.collection("user_pins").deleteMany({ userId: { $in: userIds } });
    await db.collection("user_ai_keys").deleteMany({ userId: { $in: userIds } });
    await db.collection("user_preferences").deleteMany({ userId: { $in: userIds } });
    await db.collection("accounts").deleteMany({ userId: { $in: userIds } });
    await db.collection("sessions").deleteMany({ userId: { $in: userIds } });
    await db.collection("session_meta").deleteMany({ userId });
    const usersCollection = db.collection<Record<string, unknown>>("users");
    await usersCollection.deleteMany({ _id: userId } as never);
    if (ObjectId.isValid(userId)) {
        await usersCollection.deleteMany({ _id: new ObjectId(userId) } as never);
    }
}

