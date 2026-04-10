import type { AppFont, AppTheme } from "../../../context/AppSettingsContext";

export type AssetUniverse = "coin" | "stock";

export type ProviderPreference = {
    id: string;
    name: string;
    enabled: boolean;
    baseUrl?: string;
    websiteUrl: string;
    placeholder: string;
    description: string;
};

export type UserPreferenceState = {
    font: AppFont;
    theme: AppTheme;
    analyticsTelemetryEnabled: boolean;
    supportAccessEnabled: boolean;
    activeProviderId: string;
    providerModels: Record<string, string>;
    systemPrompt: string;
    cryptoPanicApiKey: string;
    providers: ProviderPreference[];
    updatedAt: string;
};

export type FavoriteRecord = {
    universe: AssetUniverse;
    symbol: string;
    updatedAt: string;
};

export type PinRecord = {
    pinType: string;
    pinKey: string;
    label?: string;
    payload?: Record<string, unknown>;
    updatedAt: string;
};

export type AiKeyRecord = {
    providerId: string;
    hasKey: boolean;
    updatedAt: string;
    keyVersion?: number;
};
