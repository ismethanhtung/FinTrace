import { getAuthenticatedUser } from "../../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../../lib/db/database";
import { auditLog } from "../../../../../lib/server/audit/auditLog";
import { fail, ok } from "../../../../../lib/server/http/apiResponse";
import {
    clientKeyFromRequest,
    rateLimit,
} from "../../../../../lib/server/security/rateLimit";
import { revokeOtherSessions } from "../../../../../lib/server/services/accountSecurityService";


export async function POST(request: Request) {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }

    const limiter = rateLimit({
        key: `auth-revoke-others:${auth.userId}:${clientKeyFromRequest(request)}`,
        max: 20,
        windowMs: 60_000,
    });
    if (!limiter.allowed) {
        return fail(429, "Too many requests", "RATE_LIMITED", {
            retryAfterSeconds: limiter.retryAfterSeconds,
        });
    }

    await ensureUserDataIndexes();
    try {
        const { revokedCount } = await revokeOtherSessions({
            userId: auth.userId,
            cookieHeader: request.headers.get("cookie"),
        });
        auditLog("warn", {
            action: "user_sessions_revoke_others",
            userId: auth.userId,
            metadata: { revokedCount },
        });
        return ok({ ok: true, revokedCount });
    } catch (error) {
        const message = error instanceof Error ? error.message : "UNKNOWN";
        if (message === "MISSING_SESSION_TOKEN") {
            return fail(
                422,
                "Current session token not found. Sign in again and retry.",
                "INVALID_INPUT",
            );
        }
        return fail(500, "Failed to revoke other sessions", "INTERNAL_ERROR");
    }
}

