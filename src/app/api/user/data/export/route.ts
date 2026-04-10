import { getAuthenticatedUser } from "../../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../../lib/db/database";
import { auditLog } from "../../../../../lib/server/audit/auditLog";
import { fail, ok } from "../../../../../lib/server/http/apiResponse";
import {
    clientKeyFromRequest,
    rateLimit,
} from "../../../../../lib/server/security/rateLimit";
import { exportUserData } from "../../../../../lib/server/services/userDataService";


export async function POST(request: Request) {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }

    const limiter = rateLimit({
        key: `user-data-export:${auth.userId}:${clientKeyFromRequest(request)}`,
        max: 10,
        windowMs: 60_000,
    });
    if (!limiter.allowed) {
        return fail(429, "Too many requests", "RATE_LIMITED", {
            retryAfterSeconds: limiter.retryAfterSeconds,
        });
    }

    await ensureUserDataIndexes();
    try {
        const data = await exportUserData(auth.userId);
        auditLog("info", {
            action: "user_data_export",
            userId: auth.userId,
        });
        return ok({ data });
    } catch {
        return fail(500, "Failed to export data", "INTERNAL_ERROR");
    }
}

