import { getAuthenticatedUser } from "../../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../../lib/db/database";
import { auditLog } from "../../../../../lib/server/audit/auditLog";
import { fail, ok } from "../../../../../lib/server/http/apiResponse";
import {
    clientKeyFromRequest,
    rateLimit,
} from "../../../../../lib/server/security/rateLimit";
import { deleteAllUserData } from "../../../../../lib/server/services/userDataService";


export async function POST(request: Request) {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }

    const limiter = rateLimit({
        key: `user-data-delete:${auth.userId}:${clientKeyFromRequest(request)}`,
        max: 5,
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
    const confirmation =
        body && typeof body === "object"
            ? (body as Record<string, unknown>).confirmation
            : null;
    if (confirmation !== "DELETE_DATA") {
        return fail(422, "Invalid confirmation payload", "INVALID_INPUT");
    }

    await ensureUserDataIndexes();
    try {
        const result = await deleteAllUserData(auth.userId);
        auditLog("warn", {
            action: "user_data_delete_all",
            userId: auth.userId,
            metadata: { deleted: result.deleted },
        });
        return ok({ ok: true, ...result });
    } catch {
        return fail(500, "Failed to delete user data", "INTERNAL_ERROR");
    }
}

