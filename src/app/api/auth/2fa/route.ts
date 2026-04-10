import { getAuthenticatedUser } from "../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../lib/db/database";
import { fail, ok } from "../../../../lib/server/http/apiResponse";
import { getUserTwoFactor } from "../../../../lib/server/repositories/userTwoFactorRepo";

export const runtime = "nodejs";

export async function GET() {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }
    await ensureUserDataIndexes();
    const state = await getUserTwoFactor(auth.userId);
    return ok({
        enabled: Boolean(state?.enabled),
        enabledAt: state?.enabledAt?.toISOString() ?? null,
    });
}

