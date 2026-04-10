import { getAuthenticatedUser } from "../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../lib/db/database";
import { fail, ok } from "../../../../lib/server/http/apiResponse";
import {
    getUserPreferences,
    upsertUserPreferences,
} from "../../../../lib/server/repositories/userPreferencesRepo";
import type { UserPreferenceState } from "../../../../lib/server/repositories/types";


function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validatePayload(body: unknown): Omit<UserPreferenceState, "updatedAt"> | null {
    if (!isRecord(body)) return null;
    const providers = Array.isArray(body.providers) ? body.providers : [];

    return {
        font:
            typeof body.font === "string" && body.font.length > 0
                ? (body.font as UserPreferenceState["font"])
                : "Plus Jakarta Sans",
        theme:
            typeof body.theme === "string" && body.theme.length > 0
                ? (body.theme as UserPreferenceState["theme"])
                : "light",
        analyticsTelemetryEnabled: body.analyticsTelemetryEnabled !== false,
        supportAccessEnabled: body.supportAccessEnabled === true,
        activeProviderId:
            typeof body.activeProviderId === "string" && body.activeProviderId.trim().length > 0
                ? body.activeProviderId.trim()
                : "openrouter",
        providerModels: isRecord(body.providerModels)
            ? Object.entries(body.providerModels).reduce<Record<string, string>>(
                  (acc, [key, value]) => {
                      if (
                          typeof key === "string" &&
                          key.trim().length > 0 &&
                          typeof value === "string" &&
                          value.trim().length > 0
                      ) {
                          acc[key] = value;
                      }
                      return acc;
                  },
                  {},
              )
            : {},
        systemPrompt: typeof body.systemPrompt === "string" ? body.systemPrompt : "",
        cryptoPanicApiKey:
            typeof body.cryptoPanicApiKey === "string" ? body.cryptoPanicApiKey : "",
        providers: providers
            .filter(isRecord)
            .map((item) => ({
                id: typeof item.id === "string" ? item.id.trim() : "",
                name: typeof item.name === "string" ? item.name.trim() : "",
                enabled: item.enabled !== false,
                baseUrl: typeof item.baseUrl === "string" ? item.baseUrl.trim() : "",
                websiteUrl: typeof item.websiteUrl === "string" ? item.websiteUrl : "",
                placeholder: typeof item.placeholder === "string" ? item.placeholder : "",
                description: typeof item.description === "string" ? item.description : "",
            }))
            .filter((item) => item.id.length > 0 && item.name.length > 0),
    };
}

export async function GET() {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }

    await ensureUserDataIndexes();
    const preferences = await getUserPreferences(auth.userId);
    if (!preferences) return ok({ preferences: null });
    return ok({ preferences });
}

export async function PUT(request: Request) {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return fail(422, "Invalid JSON payload", "INVALID_INPUT");
    }

    const payload = validatePayload(body);
    if (!payload) {
        return fail(422, "Invalid preferences payload", "INVALID_INPUT");
    }

    await ensureUserDataIndexes();
    const preferences = await upsertUserPreferences(auth.userId, payload);
    return ok({ preferences });
}
