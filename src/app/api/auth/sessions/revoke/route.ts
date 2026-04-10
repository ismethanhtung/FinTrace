import { getAuthenticatedUser } from "../../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../../lib/db/database";
import { auditLog } from "../../../../../lib/server/audit/auditLog";
import { fail, ok } from "../../../../../lib/server/http/apiResponse";
import {
    clientKeyFromRequest,
    rateLimit,
} from "../../../../../lib/server/security/rateLimit";
import { revokeSessionByHash } from "../../../../../lib/server/services/accountSecurityService";


export async function POST(request: Request) {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }

    const limiter = rateLimit({
        key: `auth-session-revoke:${auth.userId}:${clientKeyFromRequest(request)}`,
        max: 30,
        windowMs: 60_000,
    });
    if (!limiter.allowed) {
        return fail(429, "Too many requests", "RATE_LIMITED", {
            retryAfterSeconds: limiter.retryAfterSeconds,
        });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return fail(422, "Invalid JSON payload", "INVALID_INPUT");
    }
    const sessionTokenHash =
        body && typeof body === "object"
            ? (body as Record<string, unknown>).sessionTokenHash
            : null;
    if (typeof sessionTokenHash !== "string" || sessionTokenHash.trim().length < 16) {
        return fail(422, "Invalid session token", "INVALID_INPUT");
    }

    await ensureUserDataIndexes();
    try {
        const { revoked } = await revokeSessionByHash({
            userId: auth.userId,
            cookieHeader: request.headers.get("cookie"),
            targetSessionTokenHash: sessionTokenHash.trim(),
        });
        auditLog("warn", {
            action: "user_session_revoke",
            userId: auth.userId,
            metadata: { revoked },
        });
        return ok({ ok: true, revoked });
    } catch {
        return fail(500, "Failed to revoke session", "INTERNAL_ERROR");
    }
}

