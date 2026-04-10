import { getAuthenticatedUser } from "../../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../../lib/db/database";
import { fail, ok } from "../../../../../lib/server/http/apiResponse";
import { getUserTwoFactor, savePendingTwoFactorSetup } from "../../../../../lib/server/repositories/userTwoFactorRepo";
import { createTotpSecret, createTotpSetupPayload, toQrDataUrl } from "../../../../../lib/server/security/twoFactor";


export async function POST() {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }

    await ensureUserDataIndexes();
    const existing = await getUserTwoFactor(auth.userId);
    if (existing?.enabled) {
        return fail(409, "Two-factor authentication already enabled", "CONFLICT");
    }

    const secret = createTotpSecret();
    const setup = createTotpSetupPayload({
        userId: auth.userId,
        email: auth.email,
        secret,
    });
    await savePendingTwoFactorSetup(auth.userId, secret, setup.expiresAt);

    const qrDataUrl = await toQrDataUrl(setup.otpauthUrl);
    return ok({
        manualKey: setup.manualKey,
        otpauthUrl: setup.otpauthUrl,
        qrCodeDataUrl: qrDataUrl,
        expiresAt: setup.expiresAt.toISOString(),
    });
}

