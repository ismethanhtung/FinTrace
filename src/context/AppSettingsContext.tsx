"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useLayoutEffect,
    useCallback,
} from "react";
import { getDefaultModelForProvider } from "../lib/aiModelDefaults";
import {
    normalizeTheme,
    persistClientPreferenceCookie,
    THEME_COOKIE_KEY,
    THEME_STORAGE_KEY,
} from "../lib/preferences";
import { applyThemeToDocument } from "../lib/themeDom";

// ─── Types ────────────────────────────────────────────────────────────────────
export type AppFont =
    | "Inter"
    | "Outfit"
    | "Plus Jakarta Sans"
    | "IBM Plex Sans"
    | "Space Grotesk";

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

export const FONT_STACKS: Record<AppFont, string> = {
    Inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
    Outfit: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    "Plus Jakarta Sans":
        '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    "IBM Plex Sans": '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    "Space Grotesk": '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
};

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

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppSettingsValue {
    // Appearance
    font: AppFont;
    setFont: (f: AppFont) => void;
    theme: AppTheme;
    setTheme: (t: AppTheme) => void;
    toggleTheme: () => void;

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
}: {
    children: React.ReactNode;
    initialTheme?: AppTheme;
}) => {
    const [font, setFontState] = useState<AppFont>("Inter");
    const [theme, setThemeState] = useState<AppTheme>(initialTheme);
    const [aiProviders, setAiProvidersState] = useState<AIProviderConfig[]>(
        buildDefaultProviders,
    );
    const [activeProviderId, setActiveProviderIdState] =
        useState<AIProviderId>(DEFAULT_PROVIDER);
    const [serverKeyStatus, setServerKeyStatus] = useState<
        Record<string, boolean>
    >({});
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

    // Rehydrate from localStorage on mount
    useEffect(() => {
        const savedFont = localStorage.getItem("ft-font") as AppFont | null;
        const savedThemeRaw = localStorage.getItem(THEME_STORAGE_KEY);
        const savedCPKey = localStorage.getItem("ft-cryptopanic-key");
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

        if (savedFont && FONT_STACKS[savedFont]) setFontState(savedFont);
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
        if (savedPrompt) setSystemPromptState(savedPrompt);
        setAiProvidersState(savedProviders);
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
    }, [initialTheme]);

    // Apply font
    useEffect(() => {
        document.documentElement.style.setProperty(
            "--font-sans",
            FONT_STACKS[font],
        );
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
    }, []);

    const persistProviders = useCallback((providers: AIProviderConfig[]) => {
        localStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
    }, []);

    const persistProviderModels = useCallback(
        (models: Record<string, string>) => {
            localStorage.setItem(
                PROVIDER_MODELS_STORAGE_KEY,
                JSON.stringify(models),
            );
        },
        [],
    );

    const providerHasAvailableKey = useCallback(
        (providerId: AIProviderId) => {
            const provider = aiProviders.find((item) => item.id === providerId);
            if (!provider) return false;
            const hasUserKey = Boolean(provider.apiKey?.trim());
            if (hasUserKey) {
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
        [aiProviders, serverKeyStatus],
    );

    const setFont = useCallback((f: AppFont) => {
        setFontState(f);
        localStorage.setItem("ft-font", f);
    }, []);

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
                persistProviders(next);
                return next;
            });
        },
        [persistProviders],
    );

    const setProviderEnabled = useCallback(
        (providerId: AIProviderId, enabled: boolean) => {
            setAiProvidersState((prev) => {
                const next = prev.map((p) =>
                    p.id === providerId ? { ...p, enabled } : p,
                );
                persistProviders(next);
                return next;
            });
        },
        [persistProviders],
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
                persistProviders(next);
                return next;
            });
        },
        [persistProviders],
    );

    const removeCustomProvider = useCallback(
        (providerId: AIProviderId) => {
            const isBuiltIn = BUILT_IN_PROVIDERS.some(
                (p) => p.id === providerId,
            );
            if (isBuiltIn) return;
            setAiProvidersState((prev) => {
                const next = prev.filter((p) => p.id !== providerId);
                persistProviders(next);
                return next;
            });
            setProviderModelsState((prev) => {
                const { [providerId]: _removed, ...next } = prev;
                persistProviderModels(next);
                return next;
            });
        },
        [persistProviderModels, persistProviders],
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
            localStorage.setItem("ft-openrouter-key", key);
        },
        [setProviderApiKey],
    );

    const setCryptoPanicApiKey = useCallback((key: string) => {
        setCryptoPanicApiKeyState(key);
        localStorage.setItem("ft-cryptopanic-key", key);
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
