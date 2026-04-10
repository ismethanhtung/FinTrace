import { getAuthenticatedUser } from "../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../lib/db/database";
import { fail, ok } from "../../../../lib/server/http/apiResponse";
import { listUserAiKeys } from "../../../../lib/server/repositories/userAiKeysRepo";


export async function GET() {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }
    await ensureUserDataIndexes();
    const keys = await listUserAiKeys(auth.userId);
    return ok({ keys });
}
