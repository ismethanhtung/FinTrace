import { getAuthenticatedUser } from "../../auth/server";
import { getDecryptedUserAiKey } from "../repositories/userAiKeysRepo";

export async function getUserApiKeyForProvider(
    providerId: string,
): Promise<string | null> {
    const auth = await getAuthenticatedUser();
    if (!auth) return null;
    try {
        return await getDecryptedUserAiKey(auth.userId, providerId);
    } catch {
        return null;
    }
}
