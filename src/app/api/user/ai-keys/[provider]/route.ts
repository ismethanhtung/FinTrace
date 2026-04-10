import { getAuthenticatedUser } from "../../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../../lib/db/database";
import { auditLog } from "../../../../../lib/server/audit/auditLog";
import { fail, ok } from "../../../../../lib/server/http/apiResponse";
import {
    deleteUserAiKey,
    setUserAiKey,
} from "../../../../../lib/server/repositories/userAiKeysRepo";
import {
    clientKeyFromRequest,
    rateLimit,
} from "../../../../../lib/server/security/rateLimit";


type RouteContext = {
    params: Promise<{ provider: string }>;
};

function normalizeProvider(provider: string): string | null {
    const normalized = provider.trim().toLowerCase();
    if (!normalized) return null;
    if (!/^[a-z0-9][a-z0-9-_]{1,63}$/.test(normalized)) return null;
    return normalized;
}

export async function PUT(request: Request, context: RouteContext) {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }
    const { provider: rawProvider } = await context.params;
    const provider = normalizeProvider(rawProvider);
    if (!provider) {
        return fail(422, "Invalid provider id", "INVALID_INPUT");
    }

    const limiter = rateLimit({
        key: `ai-key-write:${auth.userId}:${clientKeyFromRequest(request)}`,
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
    const apiKey =
        body && typeof body === "object"
            ? (body as Record<string, unknown>).apiKey
            : null;
    if (typeof apiKey !== "string" || apiKey.trim().length < 3) {
        return fail(422, "apiKey is required", "INVALID_INPUT");
    }

    await ensureUserDataIndexes();
    const result = await setUserAiKey(auth.userId, provider, apiKey.trim());
    auditLog("info", {
        action: "user_ai_key_set",
        userId: auth.userId,
        providerId: provider,
    });
    return ok({ key: result });
}

export async function DELETE(request: Request, context: RouteContext) {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }
    const { provider: rawProvider } = await context.params;
    const provider = normalizeProvider(rawProvider);
    if (!provider) {
        return fail(422, "Invalid provider id", "INVALID_INPUT");
    }
    const limiter = rateLimit({
        key: `ai-key-delete:${auth.userId}:${clientKeyFromRequest(request)}`,
        max: 30,
        windowMs: 60_000,
    });
    if (!limiter.allowed) {
        return fail(429, "Too many requests", "RATE_LIMITED", {
            retryAfterSeconds: limiter.retryAfterSeconds,
        });
    }

    await ensureUserDataIndexes();
    const deleted = await deleteUserAiKey(auth.userId, provider);
    auditLog("warn", {
        action: "user_ai_key_delete",
        userId: auth.userId,
        providerId: provider,
    });
    return ok({ deleted });
}
