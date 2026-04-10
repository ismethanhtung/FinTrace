import { getAuthenticatedUser } from "../../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../../lib/db/database";
import { fail, ok } from "../../../../../lib/server/http/apiResponse";
import {
    disableUserTwoFactor,
    getUserTwoFactor,
} from "../../../../../lib/server/repositories/userTwoFactorRepo";
import {
    getTwoFactorLoginCookieName,
    verifyTotpCode,
} from "../../../../../lib/server/security/twoFactor";


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
    if (!state?.enabled || !state.secret) {
        return fail(422, "Two-factor authentication is not enabled", "INVALID_INPUT");
    }
    const valid = verifyTotpCode(state.secret, code);
    if (!valid) {
        return fail(422, "Invalid verification code", "INVALID_INPUT");
    }

    await disableUserTwoFactor(auth.userId);
    const response = ok({ enabled: false });
    response.cookies.set(getTwoFactorLoginCookieName(), "", {
        path: "/",
        maxAge: 0,
    });
    return response;
}

