"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useLayoutEffect,
    useCallback,
} from "react";
import { useSession } from "next-auth/react";
import { getDefaultModelForProvider } from "../lib/aiModelDefaults";
import {
    normalizeTheme,
    persistClientPreferenceCookie,
    THEME_COOKIE_KEY,
    THEME_STORAGE_KEY,
} from "../lib/preferences";
import { applyThemeToDocument } from "../lib/themeDom";
import {
    type AppFont,
    applyAppFontToDocument,
    DEFAULT_APP_FONT,
    FONT_STORAGE_KEY,
    isAppFont,
    normalizeAppFont,
    persistAppFontClientCookie,
} from "../lib/appTypography";

export type { AppFont } from "../lib/appTypography";

// ─── Types ────────────────────────────────────────────────────────────────────
export type AppTheme =
    | "light"
    | "dark1"
    | "dark2"
    | "dark3"
    | "dark4"
    | "dark5";

export type AIProviderId = "openrouter" | "groq" | string;
export type BuiltInProviderId = "openrouter" | "groq" | "huggingface";

export const BUILT_IN_PROVIDER_IDS: BuiltInProviderId[] = [
    "openrouter",
    "groq",
    "huggingface",
];

export function isBuiltInProviderId(
    providerId: string,
): providerId is BuiltInProviderId {
    return BUILT_IN_PROVIDER_IDS.includes(providerId as BuiltInProviderId);
}

export interface AIProviderConfig {
    id: AIProviderId;
    name: string;
    apiKey: string;
    enabled: boolean;
    /**
     * Base URL for OpenAI-compatible custom providers.
     * Built-in providers leave this empty.
     */
    baseUrl?: string;
    websiteUrl: string;
    placeholder: string;
    description: string;
}

export const BUILT_IN_PROVIDERS: Omit<
    AIProviderConfig,
    "apiKey" | "enabled"
>[] = [
    {
        id: "openrouter",
        name: "OpenRouter",
        websiteUrl: "https://openrouter.ai/keys",
        placeholder: "sk-or-v1-...",
        description: "Access 200+ models via a single API key",
    },
    {
        id: "groq",
        name: "Groq",
        websiteUrl: "https://console.groq.com/keys",
        placeholder: "gsk_...",
        description: "Ultra-fast LPU inference for open-source models",
    },
    {
        id: "huggingface",
        name: "Hugging Face",
        websiteUrl: "https://huggingface.co/settings/tokens",
        placeholder: "hf_...",
        description:
            "Hugging Face Inference Providers (OpenAI-compatible router)",
    },
];

export const THEME_CYCLE: AppTheme[] = [
    "light",
    "dark1",
    "dark2",
    "dark3",
    "dark4",
    "dark5",
];

export const DEFAULT_SYSTEM_PROMPT = `You are FinTrace AI, an expert crypto market analyst embedded in the FinTrace trading platform.

You have access to real-time market data for the coin the user is currently viewing. This data will be injected at the start of each conversation.

Your role:
- Provide sharp, data-driven analysis of price action, trends, and momentum
- Explain technical indicators (MA, EMA, RSI, MACD, support/resistance)
- Assess risk/reward and market context
- Answer questions clearly, concisely, and in the user's language

You do NOT give financial advice or buy/sell recommendations. Always state that decisions are the user's own.`;

export const DEFAULT_MODEL = getDefaultModelForProvider("openrouter");
export const DEFAULT_PROVIDER: AIProviderId = "openrouter";

const PROVIDERS_STORAGE_KEY = "ft-ai-providers";
const SELECTED_PROVIDER_KEY = "ft-selected-provider";
const PROVIDER_MODELS_STORAGE_KEY = "ft-provider-models";

type PersistProviderOptions = {
    stripApiKeys?: boolean;
};

function buildDefaultProviders(): AIProviderConfig[] {
    return BUILT_IN_PROVIDERS.map((p) => ({
        ...p,
        apiKey: "",
        enabled: true,
        baseUrl: "",
    }));
}

function normalizeProvider(rawProvider: unknown): AIProviderConfig | null {
    if (!rawProvider || typeof rawProvider !== "object") return null;
    const rec = rawProvider as Record<string, unknown>;
    if (typeof rec.id !== "string" || rec.id.trim().length === 0) return null;
    if (typeof rec.name !== "string" || rec.name.trim().length === 0)
        return null;
    const id = rec.id.trim().toLowerCase().replace(/\s+/g, "-");
    const isBuiltIn = isBuiltInProviderId(id);
    return {
        id,
        name: rec.name.trim(),
        apiKey: typeof rec.apiKey === "string" ? rec.apiKey : "",
        enabled: typeof rec.enabled === "boolean" ? rec.enabled : true,
        baseUrl: typeof rec.baseUrl === "string" ? rec.baseUrl.trim() : "",
        websiteUrl: typeof rec.websiteUrl === "string" ? rec.websiteUrl : "",
        placeholder:
            typeof rec.placeholder === "string"
                ? rec.placeholder
                : "your-api-key",
        description: typeof rec.description === "string" ? rec.description : "",
    };
}

function loadProviders(): AIProviderConfig[] {
    try {
        const raw = localStorage.getItem(PROVIDERS_STORAGE_KEY);
        if (!raw) return buildDefaultProviders();
        const parsedRaw = JSON.parse(raw) as unknown[];
        const parsed = Array.isArray(parsedRaw)
            ? parsedRaw
                  .map(normalizeProvider)
                  .filter((provider): provider is AIProviderConfig =>
                      Boolean(provider),
                  )
            : [];
        // Merge in any new built-in providers not yet persisted
        const existingIds = new Set(parsed.map((p) => p.id));
        const merged = [...parsed];
        for (const bp of BUILT_IN_PROVIDERS) {
            if (!existingIds.has(bp.id)) {
                merged.push({ ...bp, apiKey: "", enabled: true, baseUrl: "" });
            }
        }
        for (let i = 0; i < merged.length; i += 1) {
            if (isBuiltInProviderId(merged[i].id)) {
                merged[i] = { ...merged[i], baseUrl: "" };
            }
        }
        return merged;
    } catch {
        return buildDefaultProviders();
    }
}

function loadProviderModels(): Record<string, string> {
    try {
        const raw = localStorage.getItem(PROVIDER_MODELS_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return Object.entries(parsed).reduce<Record<string, string>>(
            (acc, [key, value]) => {
                if (
                    typeof key === "string" &&
                    key.length > 0 &&
                    typeof value === "string" &&
                    value.trim().length > 0
                ) {
                    acc[key] = value;
                }
                return acc;
            },
            {},
        );
    } catch {
        return {};
    }
}

function sanitizeProvidersForPersistence(
    providers: AIProviderConfig[],
    options?: PersistProviderOptions,
): AIProviderConfig[] {
    if (!options?.stripApiKeys) return providers;
    return providers.map((provider) => ({
        ...provider,
        apiKey: "",
    }));
}

function mergeWithBuiltInProviders(
    providers: AIProviderConfig[],
): AIProviderConfig[] {
    const merged = [...providers];
    const existingIds = new Set(merged.map((provider) => provider.id));
    for (const builtIn of BUILT_IN_PROVIDERS) {
        if (!existingIds.has(builtIn.id)) {
            merged.push({
                ...builtIn,
                apiKey: "",
                enabled: true,
                baseUrl: "",
            });
        }
    }
    return merged.map((provider) =>
        isBuiltInProviderId(provider.id)
            ? { ...provider, baseUrl: "" }
            : provider,
    );
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppSettingsValue {
    // Appearance
    font: AppFont;
    setFont: (f: AppFont) => void;
    theme: AppTheme;
    setTheme: (t: AppTheme) => void;
    toggleTheme: () => void;
    analyticsTelemetryEnabled: boolean;
    setAnalyticsTelemetryEnabled: (enabled: boolean) => void;
    supportAccessEnabled: boolean;
    setSupportAccessEnabled: (enabled: boolean) => void;

    // AI Providers (multi-provider)
    aiProviders: AIProviderConfig[];
    setProviderApiKey: (providerId: AIProviderId, key: string) => void;
    setProviderEnabled: (providerId: AIProviderId, enabled: boolean) => void;
    addCustomProvider: (provider: Omit<AIProviderConfig, "enabled">) => void;
    removeCustomProvider: (providerId: AIProviderId) => void;
    activeProviderId: AIProviderId;
    setActiveProviderId: (id: AIProviderId) => void;
    activeProvider: AIProviderConfig | undefined;
    availableProviders: AIProviderConfig[];
    serverKeyStatus: Record<string, boolean>;
    userKeyStatus: Record<string, boolean>;

    // Legacy shim – keeps backward compatibility with existing code
    openrouterApiKey: string;
    setOpenrouterApiKey: (key: string) => void;

    // Other integrations
    cryptoPanicApiKey: string;
    setCryptoPanicApiKey: (key: string) => void;

    // AI model / prompt
    selectedModel: string;
    getSelectedModel: (providerId: AIProviderId) => string;
    setSelectedModel: (model: string, providerId?: AIProviderId) => void;
    systemPrompt: string;
    setSystemPrompt: (prompt: string) => void;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AppSettingsProvider = ({
    children,
    initialTheme = "light",
    initialFont = DEFAULT_APP_FONT,
}: {
    children: React.ReactNode;
    initialTheme?: AppTheme;
    initialFont?: AppFont;
}) => {
    const { status: authStatus } = useSession();
    const isAuthenticated = authStatus === "authenticated";
    const [font, setFontState] = useState<AppFont>(() => {
        if (typeof window === "undefined") return normalizeAppFont(initialFont);
        const raw = localStorage.getItem(FONT_STORAGE_KEY);
        if (raw && isAppFont(raw)) {
            persistAppFontClientCookie(raw);
            return raw;
        }
        return normalizeAppFont(initialFont);
    });
    const [theme, setThemeState] = useState<AppTheme>(initialTheme);
    const [analyticsTelemetryEnabled, setAnalyticsTelemetryEnabledState] =
        useState(true);
    const [supportAccessEnabled, setSupportAccessEnabledState] =
        useState(false);
    const [aiProviders, setAiProvidersState] = useState<AIProviderConfig[]>(
        buildDefaultProviders,
    );
    const [activeProviderId, setActiveProviderIdState] =
        useState<AIProviderId>(DEFAULT_PROVIDER);
    const [serverKeyStatus, setServerKeyStatus] = useState<
        Record<string, boolean>
    >({});
    const [userKeyStatus, setUserKeyStatus] = useState<Record<string, boolean>>(
        {},
    );
    const [hasLoadedServerKeyStatus, setHasLoadedServerKeyStatus] =
        useState(false);
    const [cryptoPanicApiKey, setCryptoPanicApiKeyState] = useState("");
    const [providerModels, setProviderModelsState] = useState<
        Record<string, string>
    >({
        [DEFAULT_PROVIDER]: DEFAULT_MODEL,
    });
    const [systemPrompt, setSystemPromptState] = useState(
        DEFAULT_SYSTEM_PROMPT,
    );
    const [hasHydratedLocalState, setHasHydratedLocalState] = useState(false);
    const [hasHydratedRemoteState, setHasHydratedRemoteState] = useState(false);

    // Rehydrate from localStorage on mount
    useEffect(() => {
        const savedThemeRaw = localStorage.getItem(THEME_STORAGE_KEY);
        const savedCPKey = localStorage.getItem("ft-cryptopanic-key");
        const savedAnalyticsTelemetry = localStorage.getItem(
            "ft-analytics-telemetry-enabled",
        );
        const savedSupportAccess = localStorage.getItem(
            "ft-support-access-enabled",
        );
        const savedModel = localStorage.getItem("ft-model");
        const savedPrompt = localStorage.getItem("ft-system-prompt");
        const savedProviders = loadProviders();
        const savedProviderModels = loadProviderModels();
        const savedActiveProvider = localStorage.getItem(
            SELECTED_PROVIDER_KEY,
        ) as AIProviderId | null;

        // Legacy migration: if old openrouter key exists, seed it into providers
        const legacyORKey = localStorage.getItem("ft-openrouter-key");
        if (legacyORKey) {
            const orIdx = savedProviders.findIndex(
                (p) => p.id === "openrouter",
            );
            if (orIdx !== -1 && !savedProviders[orIdx].apiKey) {
                savedProviders[orIdx].apiKey = legacyORKey;
            }
        }

        if (savedThemeRaw) {
            const savedTheme = normalizeTheme(savedThemeRaw);
            if (THEME_CYCLE.includes(savedTheme)) {
                applyThemeToDocument(savedTheme);
                setThemeState(savedTheme);
                persistClientPreferenceCookie(THEME_COOKIE_KEY, savedTheme);
            }
        } else {
            persistClientPreferenceCookie(THEME_COOKIE_KEY, initialTheme);
        }
        if (savedCPKey) setCryptoPanicApiKeyState(savedCPKey);
        if (savedAnalyticsTelemetry !== null) {
            setAnalyticsTelemetryEnabledState(
                savedAnalyticsTelemetry !== "false",
            );
        }
        if (savedSupportAccess !== null) {
            setSupportAccessEnabledState(savedSupportAccess === "true");
        }
        if (savedPrompt) setSystemPromptState(savedPrompt);
        setAiProvidersState(mergeWithBuiltInProviders(savedProviders));
        if (savedActiveProvider) setActiveProviderIdState(savedActiveProvider);

        // Legacy migration from the old single-model storage.
        if (savedModel && !savedProviderModels.openrouter) {
            savedProviderModels.openrouter = savedModel;
        }

        const effectiveProviderId = savedActiveProvider ?? DEFAULT_PROVIDER;
        if (!savedProviderModels[effectiveProviderId]) {
            savedProviderModels[effectiveProviderId] =
                getDefaultModelForProvider(effectiveProviderId);
        }

        setProviderModelsState(savedProviderModels);
        setHasHydratedLocalState(true);
    }, [initialTheme]);

    // Keep DOM font attribute in sync before paint (Tailwind `font-sans` → --font-sans).
    useLayoutEffect(() => {
        applyAppFontToDocument(font);
    }, [font]);

    // Keep DOM theme attribute in sync before paint to prevent mixed frame.
    useLayoutEffect(() => {
        applyThemeToDocument(theme);
    }, [theme]);

    useEffect(() => {
        let mounted = true;

        fetch("/api/ai/key-status", { cache: "no-store" })
            .then((res) => {
                if (!res.ok) return null;
                return res.json();
            })
            .then((json: unknown) => {
                if (!mounted || !json || typeof json !== "object") return;
                const keyMap = json as Record<string, unknown>;
                setServerKeyStatus({
                    openrouter: Boolean(keyMap.openrouter),
                    groq: Boolean(keyMap.groq),
                    huggingface: Boolean(keyMap.huggingface),
                });
            })
            .catch(() => {
                if (!mounted) return;
                setServerKeyStatus({});
            })
            .finally(() => {
                if (mounted) setHasLoadedServerKeyStatus(true);
            });

        return () => {
            mounted = false;
        };
    }, [authStatus]);

    useEffect(() => {
        let mounted = true;
        if (!isAuthenticated) {
            setUserKeyStatus({});
            return () => {
                mounted = false;
            };
        }
        fetch("/api/user/ai-keys", { cache: "no-store" })
            .then((res) => {
                if (!res.ok) return null;
                return res.json();
            })
            .then((json: unknown) => {
                if (!mounted || !json || typeof json !== "object") return;
                const keys = (json as { keys?: unknown[] }).keys;
                if (!Array.isArray(keys)) return;
                const next = keys.reduce<Record<string, boolean>>(
                    (acc, item) => {
                        if (!item || typeof item !== "object") return acc;
                        const rec = item as Record<string, unknown>;
                        const providerId =
                            typeof rec.providerId === "string"
                                ? rec.providerId.trim().toLowerCase()
                                : "";
                        const hasKey = rec.hasKey === true;
                        if (providerId && hasKey) acc[providerId] = true;
                        return acc;
                    },
                    {},
                );
                setUserKeyStatus(next);
            })
            .catch(() => {
                if (!mounted) return;
                setUserKeyStatus({});
            });
        return () => {
            mounted = false;
        };
    }, [isAuthenticated]);

    const persistProviders = useCallback(
        (providers: AIProviderConfig[], options?: PersistProviderOptions) => {
            const safe = sanitizeProvidersForPersistence(providers, options);
            localStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(safe));
        },
        [],
    );

    const persistProviderModels = useCallback(
        (models: Record<string, string>) => {
            localStorage.setItem(
                PROVIDER_MODELS_STORAGE_KEY,
                JSON.stringify(models),
            );
        },
        [],
    );

    // Server-first mode for authenticated users: hydrate settings from server once.
    useEffect(() => {
        if (!hasHydratedLocalState) return;
        if (!isAuthenticated) {
            setHasHydratedRemoteState(false);
            return;
        }
        let active = true;
        (async () => {
            try {
                const res = await fetch("/api/user/preferences", {
                    cache: "no-store",
                });
                if (!res.ok) return;
                const json = (await res.json()) as {
                    preferences?: {
                        font?: AppFont;
                        theme?: AppTheme;
                        activeProviderId?: AIProviderId;
                        analyticsTelemetryEnabled?: boolean;
                        supportAccessEnabled?: boolean;
                        providerModels?: Record<string, string>;
                        systemPrompt?: string;
                        cryptoPanicApiKey?: string;
                        providers?: Array<
                            Omit<AIProviderConfig, "apiKey" | "enabled"> & {
                                enabled?: boolean;
                            }
                        >;
                    } | null;
                };
                if (!active || !json.preferences) {
                    if (active) setHasHydratedRemoteState(true);
                    return;
                }
                const pref = json.preferences;
                if (pref.font && isAppFont(pref.font)) {
                    setFontState(pref.font);
                    applyAppFontToDocument(pref.font);
                    persistAppFontClientCookie(pref.font);
                }
                if (pref.theme && THEME_CYCLE.includes(pref.theme)) {
                    setThemeState(pref.theme);
                    applyThemeToDocument(pref.theme);
                }
                if (typeof pref.analyticsTelemetryEnabled === "boolean") {
                    setAnalyticsTelemetryEnabledState(
                        pref.analyticsTelemetryEnabled,
                    );
                }
                if (typeof pref.supportAccessEnabled === "boolean") {
                    setSupportAccessEnabledState(pref.supportAccessEnabled);
                }
                if (typeof pref.systemPrompt === "string") {
                    setSystemPromptState(pref.systemPrompt);
                }
                if (typeof pref.cryptoPanicApiKey === "string") {
                    setCryptoPanicApiKeyState(pref.cryptoPanicApiKey);
                }
                if (
                    pref.providerModels &&
                    typeof pref.providerModels === "object"
                ) {
                    setProviderModelsState(pref.providerModels);
                }
                if (Array.isArray(pref.providers)) {
                    const nextProviders = pref.providers
                        .map((provider) => ({
                            id: provider.id,
                            name: provider.name,
                            apiKey: "",
                            enabled: provider.enabled !== false,
                            baseUrl: provider.baseUrl ?? "",
                            websiteUrl: provider.websiteUrl,
                            placeholder: provider.placeholder,
                            description: provider.description,
                        }))
                        .filter((provider) => provider.id && provider.name);
                    setAiProvidersState(
                        mergeWithBuiltInProviders(nextProviders),
                    );
                }
                if (pref.activeProviderId) {
                    setActiveProviderIdState(pref.activeProviderId);
                }
            } catch {
                // keep local settings on network/auth failures
            } finally {
                if (active) setHasHydratedRemoteState(true);
            }
        })();
        return () => {
            active = false;
        };
    }, [hasHydratedLocalState, isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        if (!hasHydratedLocalState) return;
        persistProviders(aiProviders, { stripApiKeys: true });
    }, [aiProviders, hasHydratedLocalState, isAuthenticated, persistProviders]);

    // Sync settings to server after authenticated hydration (debounced).
    useEffect(() => {
        if (!isAuthenticated || !hasHydratedRemoteState) return;
        const timer = window.setTimeout(() => {
            const payload = {
                font,
                theme,
                activeProviderId,
                analyticsTelemetryEnabled,
                supportAccessEnabled,
                providerModels,
                systemPrompt,
                cryptoPanicApiKey,
                providers: aiProviders.map((provider) => ({
                    id: provider.id,
                    name: provider.name,
                    enabled: provider.enabled,
                    baseUrl: provider.baseUrl ?? "",
                    websiteUrl: provider.websiteUrl,
                    placeholder: provider.placeholder,
                    description: provider.description,
                })),
            };
            fetch("/api/user/preferences", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }).catch(() => {
                // preserve local behavior if sync fails
            });
        }, 600);
        return () => window.clearTimeout(timer);
    }, [
        activeProviderId,
        analyticsTelemetryEnabled,
        supportAccessEnabled,
        aiProviders,
        cryptoPanicApiKey,
        font,
        hasHydratedRemoteState,
        isAuthenticated,
        providerModels,
        systemPrompt,
        theme,
    ]);

    const setFont = useCallback((f: AppFont) => {
        setFontState(f);
        localStorage.setItem(FONT_STORAGE_KEY, f);
        applyAppFontToDocument(f);
        persistAppFontClientCookie(f);
    }, []);

    const providerHasAvailableKey = useCallback(
        (providerId: AIProviderId) => {
            const provider = aiProviders.find((item) => item.id === providerId);
            if (!provider) return false;
            const hasUserKey = Boolean(provider.apiKey?.trim());
            const hasPersistedUserKey = Boolean(userKeyStatus[providerId]);
            if (hasUserKey || hasPersistedUserKey) {
                // Custom providers bắt buộc phải có baseUrl để routing đúng proxy server.
                if (!isBuiltInProviderId(provider.id)) {
                    return Boolean(provider.baseUrl?.trim());
                }
                return true;
            }
            if (isBuiltInProviderId(provider.id))
                return Boolean(serverKeyStatus[providerId]);
            return false;
        },
        [aiProviders, serverKeyStatus, userKeyStatus],
    );

    const setTheme = useCallback((t: AppTheme) => {
        applyThemeToDocument(t, { disableTransitions: true });
        setThemeState(t);
        localStorage.setItem(THEME_STORAGE_KEY, t);
        persistClientPreferenceCookie(THEME_COOKIE_KEY, t);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const idx = THEME_CYCLE.indexOf(prev);
            const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
            applyThemeToDocument(next, { disableTransitions: true });
            localStorage.setItem(THEME_STORAGE_KEY, next);
            persistClientPreferenceCookie(THEME_COOKIE_KEY, next);
            return next;
        });
    }, []);

    const setProviderApiKey = useCallback(
        (providerId: AIProviderId, key: string) => {
            setAiProvidersState((prev) => {
                const next = prev.map((p) =>
                    p.id === providerId ? { ...p, apiKey: key } : p,
                );
                persistProviders(next, { stripApiKeys: isAuthenticated });
                return next;
            });
            if (isAuthenticated) {
                const normalizedProviderId = providerId.trim().toLowerCase();
                if (key.trim().length > 0) {
                    setUserKeyStatus((prev) => ({
                        ...prev,
                        [normalizedProviderId]: true,
                    }));
                    fetch(
                        `/api/user/ai-keys/${encodeURIComponent(normalizedProviderId)}`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ apiKey: key }),
                        },
                    ).catch(() => {
                        // no-op: local state is optimistic
                    });
                    return;
                }
                setUserKeyStatus((prev) => {
                    const next = { ...prev };
                    delete next[normalizedProviderId];
                    return next;
                });
                fetch(
                    `/api/user/ai-keys/${encodeURIComponent(normalizedProviderId)}`,
                    {
                        method: "DELETE",
                    },
                ).catch(() => {
                    // no-op: local state is optimistic
                });
            }
        },
        [isAuthenticated, persistProviders],
    );

    const setProviderEnabled = useCallback(
        (providerId: AIProviderId, enabled: boolean) => {
            setAiProvidersState((prev) => {
                const next = prev.map((p) =>
                    p.id === providerId ? { ...p, enabled } : p,
                );
                persistProviders(next, { stripApiKeys: isAuthenticated });
                return next;
            });
        },
        [isAuthenticated, persistProviders],
    );

    const addCustomProvider = useCallback(
        (provider: Omit<AIProviderConfig, "enabled">) => {
            setAiProvidersState((prev) => {
                if (prev.find((p) => p.id === provider.id)) return prev;
                const next = [
                    ...prev,
                    {
                        ...provider,
                        id: provider.id
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, "-"),
                        baseUrl: provider.baseUrl?.trim() ?? "",
                        enabled: true,
                    },
                ];
                persistProviders(next, { stripApiKeys: isAuthenticated });
                return next;
            });
        },
        [isAuthenticated, persistProviders],
    );

    const removeCustomProvider = useCallback(
        (providerId: AIProviderId) => {
            const isBuiltIn = BUILT_IN_PROVIDERS.some(
                (p) => p.id === providerId,
            );
            if (isBuiltIn) return;
            setAiProvidersState((prev) => {
                const next = prev.filter((p) => p.id !== providerId);
                persistProviders(next, { stripApiKeys: isAuthenticated });
                return next;
            });
            setProviderModelsState((prev) => {
                const { [providerId]: _removed, ...next } = prev;
                persistProviderModels(next);
                return next;
            });
        },
        [isAuthenticated, persistProviderModels, persistProviders],
    );

    const setActiveProviderId = useCallback(
        (id: AIProviderId) => {
            const provider = aiProviders.find((item) => item.id === id);
            if (!provider?.enabled) return;
            if (!providerHasAvailableKey(id)) return;
            setActiveProviderIdState(id);
            localStorage.setItem(SELECTED_PROVIDER_KEY, id);
        },
        [aiProviders, providerHasAvailableKey],
    );

    // Legacy shim for openrouterApiKey
    const openrouterApiKey =
        aiProviders.find((p) => p.id === "openrouter")?.apiKey ?? "";
    const setOpenrouterApiKey = useCallback(
        (key: string) => {
            setProviderApiKey("openrouter", key);
            if (!isAuthenticated) {
                localStorage.setItem("ft-openrouter-key", key);
            }
        },
        [isAuthenticated, setProviderApiKey],
    );

    const setCryptoPanicApiKey = useCallback((key: string) => {
        setCryptoPanicApiKeyState(key);
        localStorage.setItem("ft-cryptopanic-key", key);
    }, []);
    const setAnalyticsTelemetryEnabled = useCallback((enabled: boolean) => {
        setAnalyticsTelemetryEnabledState(enabled);
        localStorage.setItem(
            "ft-analytics-telemetry-enabled",
            enabled ? "true" : "false",
        );
    }, []);
    const setSupportAccessEnabled = useCallback((enabled: boolean) => {
        setSupportAccessEnabledState(enabled);
        localStorage.setItem(
            "ft-support-access-enabled",
            enabled ? "true" : "false",
        );
    }, []);

    const getSelectedModel = useCallback(
        (providerId: AIProviderId) => {
            return (
                providerModels[providerId] ??
                getDefaultModelForProvider(providerId)
            );
        },
        [providerModels],
    );

    const setSelectedModel = useCallback(
        (model: string, providerId?: AIProviderId) => {
            const targetProviderId = providerId ?? activeProviderId;
            setProviderModelsState((prev) => {
                const next = { ...prev, [targetProviderId]: model };
                persistProviderModels(next);
                if (targetProviderId === "openrouter") {
                    localStorage.setItem("ft-model", model);
                }
                return next;
            });
        },
        [activeProviderId, persistProviderModels],
    );

    const setSystemPrompt = useCallback((prompt: string) => {
        setSystemPromptState(prompt);
        localStorage.setItem("ft-system-prompt", prompt);
    }, []);

    useEffect(() => {
        if (!hasLoadedServerKeyStatus) return;
        const active = aiProviders.find(
            (provider) => provider.id === activeProviderId,
        );
        if (active?.enabled && providerHasAvailableKey(activeProviderId))
            return;

        const fallbackProvider = aiProviders.find(
            (provider) =>
                provider.enabled && providerHasAvailableKey(provider.id),
        );

        if (!fallbackProvider) {
            // No available provider; keep activeProviderId as-is but downstream UI must block.
            return;
        }
        if (fallbackProvider.id === activeProviderId) return;

        setActiveProviderIdState(fallbackProvider.id);
        localStorage.setItem(SELECTED_PROVIDER_KEY, fallbackProvider.id);
    }, [
        activeProviderId,
        aiProviders,
        hasLoadedServerKeyStatus,
        providerHasAvailableKey,
    ]);

    const activeProvider = aiProviders.find((p) => p.id === activeProviderId);
    const availableProviders = aiProviders.filter(
        (provider) => provider.enabled && providerHasAvailableKey(provider.id),
    );
    const selectedModel = getSelectedModel(activeProviderId);

    return (
        <AppSettingsContext.Provider
            value={{
                font,
                setFont,
                theme,
                setTheme,
                toggleTheme,
                analyticsTelemetryEnabled,
                setAnalyticsTelemetryEnabled,
                supportAccessEnabled,
                setSupportAccessEnabled,
                aiProviders,
                setProviderApiKey,
                setProviderEnabled,
                addCustomProvider,
                removeCustomProvider,
                activeProviderId,
                setActiveProviderId,
                activeProvider,
                availableProviders,
                serverKeyStatus,
                userKeyStatus,
                openrouterApiKey,
                setOpenrouterApiKey,
                cryptoPanicApiKey,
                setCryptoPanicApiKey,
                selectedModel,
                getSelectedModel,
                setSelectedModel,
                systemPrompt,
                setSystemPrompt,
            }}
        >
            {children}
        </AppSettingsContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAppSettings = (): AppSettingsValue => {
    const ctx = useContext(AppSettingsContext);
    if (!ctx)
        throw new Error(
            "useAppSettings must be used inside AppSettingsProvider",
        );
    return ctx;
};
