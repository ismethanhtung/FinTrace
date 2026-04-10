import type { Collection } from "mongodb";
import { getDb } from "../../db/database";
import type {
    ProviderPreference,
    UserPreferenceState,
} from "./types";

type UserPreferencesDoc = {
    userId: string;
    font?: string;
    theme?: string;
    activeProviderId?: string;
    providerModels?: Record<string, string>;
    systemPrompt?: string;
    cryptoPanicApiKey?: string;
    providers?: ProviderPreference[];
    updatedAt: Date;
    createdAt: Date;
};

function collection(dbName?: string): Promise<Collection<UserPreferencesDoc>> {
    return getDb().then((db) =>
        db.collection<UserPreferencesDoc>(dbName || "user_preferences"),
    );
}

export async function getUserPreferences(
    userId: string,
): Promise<UserPreferenceState | null> {
    const doc = await (await collection()).findOne({ userId });
    if (!doc) return null;
    return {
        font: (doc.font || "Inter") as UserPreferenceState["font"],
        theme: (doc.theme || "light") as UserPreferenceState["theme"],
        activeProviderId: doc.activeProviderId || "openrouter",
        providerModels: doc.providerModels || {},
        systemPrompt: doc.systemPrompt || "",
        cryptoPanicApiKey: doc.cryptoPanicApiKey || "",
        providers: doc.providers || [],
        updatedAt: doc.updatedAt.toISOString(),
    };
}

type UpsertPreferencesInput = Omit<UserPreferenceState, "updatedAt">;

export async function upsertUserPreferences(
    userId: string,
    input: UpsertPreferencesInput,
): Promise<UserPreferenceState> {
    const now = new Date();
    const setFields: Omit<UserPreferencesDoc, "createdAt"> = {
        userId,
        font: input.font,
        theme: input.theme,
        activeProviderId: input.activeProviderId,
        providerModels: input.providerModels,
        systemPrompt: input.systemPrompt,
        cryptoPanicApiKey: input.cryptoPanicApiKey,
        providers: input.providers,
        updatedAt: now,
    };

    await (await collection()).updateOne(
        { userId },
        {
            $set: setFields,
            $setOnInsert: {
                createdAt: now,
            },
        },
        { upsert: true },
    );

    return {
        ...input,
        updatedAt: now.toISOString(),
    };
}
