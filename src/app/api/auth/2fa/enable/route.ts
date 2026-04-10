import { getAuthenticatedUser } from "../../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../../lib/db/database";
import { fail, ok } from "../../../../../lib/server/http/apiResponse";
import {
    enableUserTwoFactor,
    getUserTwoFactor,
} from "../../../../../lib/server/repositories/userTwoFactorRepo";
import { verifyTotpCode } from "../../../../../lib/server/security/twoFactor";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }
    await ensureUserDataIndexes();

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return fail(422, "Invalid JSON payload", "INVALID_INPUT");
    }
    const code = String((body as { code?: unknown })?.code || "")
        .trim()
        .replace(/\s+/g, "");
    if (!/^\d{6}$/.test(code)) {
        return fail(422, "Invalid verification code", "INVALID_INPUT");
    }

    const state = await getUserTwoFactor(auth.userId);
    const pendingSecret = state?.pendingSecret;
    const pendingSetupExpiresAt = state?.pendingSetupExpiresAt;
    if (!pendingSecret || !pendingSetupExpiresAt) {
        return fail(422, "No pending setup found", "INVALID_INPUT");
    }
    if (pendingSetupExpiresAt.getTime() < Date.now()) {
        return fail(422, "Setup session expired. Please try again.", "INVALID_INPUT");
    }
    const valid = verifyTotpCode(pendingSecret, code);
    if (!valid) {
        return fail(422, "Invalid verification code", "INVALID_INPUT");
    }

    await enableUserTwoFactor(auth.userId, pendingSecret);
    return ok({ enabled: true });
}

