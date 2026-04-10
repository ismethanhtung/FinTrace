import { getAuthenticatedUser } from "../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../lib/db/database";
import { fail, ok } from "../../../../lib/server/http/apiResponse";
import {
    clientKeyFromRequest,
    rateLimit,
} from "../../../../lib/server/security/rateLimit";
import { listActiveSessions } from "../../../../lib/server/services/accountSecurityService";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }

    const limiter = rateLimit({
        key: `auth-sessions-list:${auth.userId}:${clientKeyFromRequest(request)}`,
        max: 60,
        windowMs: 60_000,
    });
    if (!limiter.allowed) {
        return fail(429, "Too many requests", "RATE_LIMITED", {
            retryAfterSeconds: limiter.retryAfterSeconds,
        });
    }

    await ensureUserDataIndexes();
    try {
        const sessions = await listActiveSessions({
            userId: auth.userId,
            cookieHeader: request.headers.get("cookie"),
            requestHeaders: request.headers,
        });
        return ok({ sessions });
    } catch (error) {
        const message = error instanceof Error ? error.message : "UNKNOWN";
        if (message === "MISSING_SESSION_TOKEN") {
            return fail(
                422,
                "Current session token not found. Sign in again and retry.",
                "INVALID_INPUT",
            );
        }
        return fail(500, "Failed to list sessions", "INTERNAL_ERROR");
    }
}

