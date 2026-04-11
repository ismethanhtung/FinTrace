"use client";

import React, { useCallback, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import SettingsLayout, {
    SETTINGS_SECTION_IDS,
} from "../../components/SettingsLayout";
import {
    Globe,
    Type,
    Palette,
    Check,
    Eye,
    EyeOff,
    Plus,
    Trash2,
    ExternalLink,
    KeyRound,
    ChevronDown,
    Sparkles,
    Shield,
    Database,
    Mail,
    Bell,
    User,
    Laptop,
    Smartphone,
} from "lucide-react";
import {
    useAppSettings,
    AppFont,
    AppTheme,
    FONT_STACKS,
    BUILT_IN_PROVIDERS,
    AIProviderConfig,
    AIProviderId,
    DEFAULT_SYSTEM_PROMPT,
} from "../../context/AppSettingsContext";
import { useI18n } from "../../context/I18nContext";
import { cn } from "../../lib/utils";
import { aiProviderService, ModelInfo } from "../../services/aiProviderService";
import { getFallbackModelsForProvider } from "../../lib/aiModelDefaults";
import { TwoFactorSettingsPanel } from "../../components/settings/TwoFactorSettingsPanel";
import { ConnectionTestPanel } from "../../components/settings/ConnectionTestPanel";

// ─── Font preview card ────────────────────────────────────────────────────────
const FONT_OPTIONS: { value: AppFont; description: string }[] = [
    {
        value: "Inter",
        description: "Clean, neutral — default sans-serif for UI",
    },
    {
        value: "Outfit",
        description: "Geometric and airy — more breathing room",
    },
    {
        value: "Plus Jakarta Sans",
        description: "Modern, wider letterforms — very readable",
    },
    {
        value: "IBM Plex Sans",
        description: "Technical, slightly wider — great for data",
    },
    {
        value: "Space Grotesk",
        description: "Distinctive, rounded — unique personality",
    },
];

// ─── Theme card ───────────────────────────────────────────────────────────────
const THEME_OPTIONS: {
    value: AppTheme;
    label: string;
    bg: string;
    text: string;
    border: string;
    secondaryBg: string;
}[] = [
    {
        value: "light",
        label: "Light",
        bg: "#FFFFFF",
        text: "#171717",
        border: "#EDEDED",
        secondaryBg: "#F5F7F9",
    },
    {
        value: "dark1",
        label: "Dark I",
        bg: "#1C1C1F",
        text: "#F0EFEC",
        border: "#3A3A3F",
        secondaryBg: "#252528",
    },
    {
        value: "dark2",
        label: "Dark II",
        bg: "#0E1520",
        text: "#CDD6E8",
        border: "#243045",
        secondaryBg: "#16202E",
    },
    {
        value: "dark3",
        label: "Dark III",
        bg: "#13111C",
        text: "#E8E4F5",
        border: "#2E2A40",
        secondaryBg: "#1C1928",
    },
    {
        value: "dark4",
        label: "Dark IV",
        bg: "#0D1714",
        text: "#D4EDE1",
        border: "#1E3328",
        secondaryBg: "#142119",
    },
    {
        value: "dark5",
        label: "Dark V",
        bg: "#090909",
        text: "#E8E8E8",
        border: "#222222",
        secondaryBg: "#131313",
    },
];

// ─── SettingsRow — label/description left, control right ─────────────────────
const SettingsRow = ({
    label,
    description,
    children,
    vertical = false,
    danger = false,
}: {
    label: string;
    description?: React.ReactNode;
    children: React.ReactNode;
    vertical?: boolean;
    danger?: boolean;
}) => (
    <div
        className={cn(
            "py-5",
            vertical ? "space-y-3" : "flex items-start justify-between gap-8",
        )}
    >
        <div className="min-w-0 flex-1">
            <p
                className={cn(
                    "text-[14px] font-medium",
                    danger ? "text-rose-500" : "text-main",
                )}
            >
                {label}
            </p>
            {description && (
                <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
                    {description}
                </p>
            )}
        </div>
        {vertical ? (
            <div>{children}</div>
        ) : (
            <div className="shrink-0 w-[280px]">{children}</div>
        )}
    </div>
);

// ─── FieldInput ───────────────────────────────────────────────────────────────
const FieldInput = ({
    type = "text",
    placeholder,
    defaultValue,
    className,
}: {
    type?: string;
    placeholder?: string;
    defaultValue?: string;
    className?: string;
}) => (
    <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={cn(
            "w-full bg-secondary border border-main rounded-lg py-2.5 px-4 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-muted/50",
            className,
        )}
    />
);

// ─── FieldSelect ──────────────────────────────────────────────────────────────
const FieldSelect = ({
    children,
    defaultValue,
}: {
    children: React.ReactNode;
    defaultValue?: string;
}) => (
    <select
        defaultValue={defaultValue}
        className="w-full bg-secondary border border-main rounded-lg py-2.5 px-4 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30 appearance-none"
    >
        {children}
    </select>
);

// ─── Toggle component ─────────────────────────────────────────────────────────
const Toggle = ({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
}) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
            "w-11 h-6 rounded-full relative transition-colors shrink-0",
            checked ? "bg-accent" : "bg-secondary border border-main",
        )}
        aria-checked={checked}
        role="switch"
    >
        <span
            className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all",
                checked ? "right-1" : "left-1",
            )}
        />
    </button>
);

const ActiveSessionsPanel = ({
    t,
    sessions,
    isLoadingSessions,
    isRevokingSessions,
    onRevokeOtherSessions,
    onRevokeSession,
}: {
    t: (key: any, params?: Record<string, unknown>) => string;
    sessions: Array<{
        sessionTokenHash: string;
        isCurrent: boolean;
        expires: string;
        createdAt?: string;
        lastSeenAt?: string;
        ip?: string;
        country?: string | null;
        deviceLabel: string;
        osLabel: string;
        browserLabel: string;
    }>;
    isLoadingSessions: boolean;
    isRevokingSessions: boolean;
    onRevokeOtherSessions: () => void;
    onRevokeSession: (sessionTokenHash: string) => void;
}) => (
    <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-muted">Active sessions</p>
            <button
                type="button"
                onClick={onRevokeOtherSessions}
                disabled={isRevokingSessions}
                className="px-4 py-2 text-[12px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {isRevokingSessions
                    ? `${t("settingsPage.loading")}...`
                    : t("settingsPage.logoutAll")}
            </button>
        </div>

        <div className="rounded-xl border border-main bg-secondary/30 overflow-hidden">
            {isLoadingSessions ? (
                <div className="p-4 text-[12px] text-muted">
                    {t("settingsPage.loading")}...
                </div>
            ) : sessions.length === 0 ? (
                <div className="p-4 text-[12px] text-muted">
                    No session info yet. It will appear after you use the app.
                </div>
            ) : (
                <div className="divide-y divide-[var(--border-color)]">
                    {sessions.map((s) => {
                        const isDesktop = s.deviceLabel === "Desktop";
                        const Icon = isDesktop ? Laptop : Smartphone;
                        return (
                            <div
                                key={s.sessionTokenHash}
                                className="p-4 flex items-start justify-between gap-4"
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-main border border-main flex items-center justify-center shrink-0">
                                        <Icon
                                            size={16}
                                            className="text-muted"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <p className="text-[13px] font-semibold truncate">
                                                {s.browserLabel}
                                            </p>
                                            {s.isCurrent && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                                    This device
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted truncate">
                                            {s.osLabel} · {s.deviceLabel}
                                        </p>
                                        <p className="text-[11px] text-muted">
                                            {s.country ? `${s.country} · ` : ""}
                                            {s.ip && s.ip !== "unknown"
                                                ? s.ip
                                                : "IP unknown"}
                                            {s.lastSeenAt
                                                ? ` · Last seen ${new Date(s.lastSeenAt).toLocaleString()}`
                                                : ""}
                                        </p>
                                    </div>
                                </div>

                                <div className="shrink-0 flex flex-col items-end gap-2">
                                    <p className="text-[10px] text-muted">
                                        Expires{" "}
                                        {new Date(
                                            s.expires,
                                        ).toLocaleDateString()}
                                    </p>
                                    {!s.isCurrent && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onRevokeSession(
                                                    s.sessionTokenHash,
                                                )
                                            }
                                            className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors"
                                        >
                                            Log out
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
);

// ─── API Key input with show/hide ─────────────────────────────────────────────
const ApiKeyInput = ({
    value,
    placeholder,
    onChange,
}: {
    value: string;
    placeholder: string;
    onChange: (v: string) => void;
}) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-main border border-main rounded-lg py-2.5 px-4 pr-10 text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:opacity-40 placeholder:font-sans"
            />
            <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
                tabIndex={-1}
            >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
        </div>
    );
};

// ─── Provider Card ────────────────────────────────────────────────────────────
const ProviderCard = ({
    provider,
    isBuiltIn,
    keySource,
    onKeyChange,
    onToggle,
    onRemove,
}: {
    provider: AIProviderConfig;
    isBuiltIn: boolean;
    keySource: "user" | "platform" | "none";
    onKeyChange: (key: string) => void;
    onToggle: (enabled: boolean) => void;
    onRemove: () => void;
}) => {
    const { t } = useI18n();
    const [expanded, setExpanded] = useState(false);
    const hasKey = keySource !== "none";
    const statusLabel =
        keySource === "user"
            ? t("settingsPage.personalKey")
            : keySource === "platform"
              ? t("settingsPage.platformKey")
              : t("settingsPage.noKey");

    return (
        <div
            className={cn(
                "rounded-xl border transition-all",
                provider.enabled
                    ? "border-main bg-main"
                    : "border-main/50 bg-main/50 opacity-60",
            )}
        >
            {/* Header row */}
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            hasKey
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-secondary text-muted",
                        )}
                    >
                        <KeyRound size={14} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-main">
                                {provider.name}
                            </span>
                            <span
                                className={cn(
                                    "text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded",
                                    keySource === "user"
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : keySource === "platform"
                                          ? "bg-accent/10 text-accent"
                                          : "bg-secondary text-muted",
                                )}
                            >
                                {statusLabel}
                            </span>
                        </div>
                        <p className="text-[11px] text-muted truncate">
                            {provider.description}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                    {!isBuiltIn && (
                        <button
                            onClick={onRemove}
                            className="p-1.5 rounded-md text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title={t("settingsPage.removeProvider")}
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                    <Toggle checked={provider.enabled} onChange={onToggle} />
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className={cn(
                            "p-1.5 rounded-md text-muted hover:text-main transition-all",
                            expanded && "rotate-180",
                        )}
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>
            </div>

            {/* Expanded key input */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-main pt-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                            {t("settingsPage.apiKey")}
                        </label>
                        <ApiKeyInput
                            value={provider.apiKey}
                            placeholder={provider.placeholder}
                            onChange={onKeyChange}
                        />
                        <p className="text-[11px] text-muted">
                            {keySource === "user"
                                ? t("settingsPage.usingPersonalKey")
                                : keySource === "platform"
                                  ? t("settingsPage.usingPlatformKey")
                                  : t("settingsPage.noKeyAvailable")}
                        </p>
                    </div>
                    <p className="text-[11px] text-muted">
                        {t("settingsPage.getYourKeyAt")}{" "}
                        <a
                            href={provider.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline inline-flex items-center gap-0.5"
                        >
                            {
                                provider.websiteUrl
                                    .replace("https://", "")
                                    .split("/")[0]
                            }
                            <ExternalLink size={10} />
                        </a>
                    </p>
                </div>
            )}
        </div>
    );
};

// ─── Add Custom Provider Modal ────────────────────────────────────────────────
const AddProviderForm = ({
    onAdd,
}: {
    onAdd: (p: Omit<AIProviderConfig, "enabled">) => void;
}) => {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        id: "",
        name: "",
        apiKey: "",
        baseUrl: "",
        placeholder: "your-api-key",
        websiteUrl: "",
        description: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.id.trim() || !form.name.trim()) return;
        onAdd({
            id: form.id.trim().toLowerCase().replace(/\s+/g, "-"),
            name: form.name.trim(),
            apiKey: form.apiKey.trim(),
            baseUrl: form.baseUrl.trim(),
            placeholder: form.placeholder || "your-api-key",
            websiteUrl: form.websiteUrl.trim(),
            description: form.description.trim(),
        });
        setForm({
            id: "",
            name: "",
            apiKey: "",
            baseUrl: "",
            placeholder: "your-api-key",
            websiteUrl: "",
            description: "",
        });
        setOpen(false);
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-main hover:border-accent/40 hover:bg-accent/5 transition-colors text-muted hover:text-main text-[13px]"
            >
                <Plus size={14} />
                <span>{t("settingsPage.addCustomProvider")}</span>
            </button>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="p-5 rounded-xl border border-accent/30 bg-accent/5 space-y-4"
        >
            <h4 className="text-[13px] font-bold text-main">
                {t("settingsPage.addCustomProvider")}
            </h4>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                        {t("settingsPage.providerIdRequired")}
                    </label>
                    <input
                        required
                        placeholder={t("settingsPage.providerIdPlaceholder")}
                        value={form.id}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, id: e.target.value }))
                        }
                        className="w-full bg-main border border-main rounded-lg py-2 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                        {t("settingsPage.displayNameRequired")}
                    </label>
                    <input
                        required
                        placeholder={t("settingsPage.displayNamePlaceholder")}
                        value={form.name}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className="w-full bg-main border border-main rounded-lg py-2 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    {t("settingsPage.apiKey")}
                </label>
                <ApiKeyInput
                    value={form.apiKey}
                    placeholder="your-api-key"
                    onChange={(v) => setForm((f) => ({ ...f, apiKey: v }))}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    {t("settingsPage.baseUrlRequired")}
                </label>
                <input
                    required
                    placeholder="https://llm.provider.vn/v1"
                    value={form.baseUrl}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, baseUrl: e.target.value }))
                    }
                    className="w-full bg-main border border-main rounded-lg py-2 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30 font-mono"
                />
                <p className="text-[11px] text-muted">
                    {t("settingsPage.baseUrlExamplePrefix")}{" "}
                    <code className="bg-secondary border border-main px-1 py-0.5 rounded text-[11px]">
                        /chat/completions
                    </code>{" "}
                    {t("settingsPage.baseUrlExampleAnd")}{" "}
                    <code className="bg-secondary border border-main px-1 py-0.5 rounded text-[11px]">
                        /models
                    </code>
                    .
                </p>
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    {t("settingsPage.websiteUrl")}
                </label>
                <input
                    placeholder="https://console.example.com/keys"
                    value={form.websiteUrl}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, websiteUrl: e.target.value }))
                    }
                    className="w-full bg-main border border-main rounded-lg py-2 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    {t("settingsPage.description")}
                </label>
                <input
                    placeholder={t("settingsPage.shortDescription")}
                    value={form.description}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    className="w-full bg-main border border-main rounded-lg py-2 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
            </div>
            <div className="flex gap-2 justify-end">
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-[12px] rounded-lg border border-main text-muted hover:text-main transition-colors"
                >
                    {t("settingsPage.cancel")}
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-[12px] rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 transition-colors"
                >
                    {t("settingsPage.addProvider")}
                </button>
            </div>
        </form>
    );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const { t } = useI18n();
    const {
        font,
        setFont,
        theme,
        setTheme,
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
        activeProvider,
        serverKeyStatus,
        userKeyStatus,
        cryptoPanicApiKey,
        setCryptoPanicApiKey,
        getSelectedModel,
        setSelectedModel,
        systemPrompt,
        setSystemPrompt,
    } = useAppSettings();
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeSection, setActiveSection] = useState("profile");

    const selectSection = useCallback(
        (id: string) => {
            setActiveSection(id);
            router.replace(`/settings?section=${encodeURIComponent(id)}`, {
                scroll: false,
            });
        },
        [router],
    );

    useEffect(() => {
        const raw = searchParams.get("section");
        if (raw && SETTINGS_SECTION_IDS.includes(raw)) {
            setActiveSection(raw);
        }
    }, [searchParams]);
    const [modelProviderId, setModelProviderId] =
        useState<AIProviderId>(activeProviderId);
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isRevokingSessions, setIsRevokingSessions] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [isExportingData, setIsExportingData] = useState(false);
    const [isDeletingData, setIsDeletingData] = useState(false);
    const [sessions, setSessions] = useState<
        Array<{
            sessionTokenHash: string;
            isCurrent: boolean;
            expires: string;
            createdAt?: string;
            lastSeenAt?: string;
            ip?: string;
            country?: string | null;
            deviceLabel: string;
            osLabel: string;
            browserLabel: string;
        }>
    >([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const modelProvider =
        aiProviders.find((provider) => provider.id === modelProviderId) ??
        activeProvider;
    const modelSelectionValue = getSelectedModel(
        modelProvider?.id ?? activeProviderId,
    );
    const modelKeySource =
        modelProvider &&
        (modelProvider.apiKey?.trim() || userKeyStatus[modelProvider.id])
            ? "user"
            : modelProvider
              ? serverKeyStatus[modelProvider.id]
                  ? "platform"
                  : "none"
              : "none";

    useEffect(() => {
        setModelProviderId(activeProviderId);
    }, [activeProviderId]);

    useEffect(() => {
        if (!modelProvider) {
            setModels([]);
            return;
        }

        setIsLoadingModels(true);
        aiProviderService
            .getModels(
                modelProvider.id,
                modelProvider.apiKey,
                modelProvider.baseUrl,
            )
            .then((list) => {
                const effective =
                    list.length > 0
                        ? list
                        : getFallbackModelsForProvider(modelProvider.id);
                setModels(effective);
                if (
                    effective.length > 0 &&
                    !effective.find((m) => m.id === modelSelectionValue)
                ) {
                    setSelectedModel(effective[0].id, modelProvider.id);
                }
            })
            .catch((err) => {
                console.warn(
                    "[Settings] Failed to load provider models, using fallback:",
                    err,
                );
                const fallback = getFallbackModelsForProvider(modelProvider.id);
                setModels(fallback);
                if (
                    fallback.length > 0 &&
                    !fallback.find((m) => m.id === modelSelectionValue)
                ) {
                    setSelectedModel(fallback[0].id, modelProvider.id);
                }
            })
            .finally(() => setIsLoadingModels(false));
    }, [modelProvider, modelProviderId, modelSelectionValue, setSelectedModel]);

    const builtInIds = new Set(BUILT_IN_PROVIDERS.map((p) => p.id));
    const availableProviderCount = aiProviders.filter(
        (provider) =>
            Boolean(provider.apiKey?.trim()) ||
            Boolean(serverKeyStatus[provider.id]),
    ).length;
    const modelProviderOptions = aiProviders;

    const handleRevokeOtherSessions = async () => {
        if (isRevokingSessions) return;
        setIsRevokingSessions(true);
        try {
            const res = await fetch("/api/auth/sessions/revoke-others", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
            });
            const json = (await res.json().catch(() => ({}))) as {
                error?: string;
                revokedCount?: number;
            };
            if (!res.ok) {
                throw new Error(json.error || "Failed to revoke sessions");
            }
            window.alert(
                `Logged out ${json.revokedCount ?? 0} other session(s). Current device stays signed in.`,
            );
        } catch (error) {
            window.alert(
                error instanceof Error
                    ? error.message
                    : "Failed to revoke other sessions",
            );
        } finally {
            setIsRevokingSessions(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (isDeletingAccount) return;
        const confirmed = window.confirm(
            "This action permanently deletes your account and all associated data. Continue?",
        );
        if (!confirmed) return;
        const typed = window.prompt(
            'Type "DELETE" to confirm account deletion:',
        );
        if (typed !== "DELETE") {
            window.alert(
                "Account deletion cancelled: confirmation did not match.",
            );
            return;
        }
        setIsDeletingAccount(true);
        try {
            const res = await fetch("/api/user/account/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation: "DELETE" }),
            });
            const json = (await res.json().catch(() => ({}))) as {
                error?: string;
            };
            if (!res.ok) {
                throw new Error(json.error || "Failed to delete account");
            }
            await signOut({ callbackUrl: "/" });
        } catch (error) {
            window.alert(
                error instanceof Error
                    ? error.message
                    : "Failed to delete account",
            );
            setIsDeletingAccount(false);
        }
    };

    const handleRequestDataExport = async () => {
        if (isExportingData) return;
        setIsExportingData(true);
        try {
            const res = await fetch("/api/user/data/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
            });
            const json = (await res.json().catch(() => ({}))) as {
                error?: string;
                data?: Record<string, unknown>;
            };
            if (!res.ok || !json.data) {
                throw new Error(json.error || "Failed to export data");
            }
            const blob = new Blob([JSON.stringify(json.data, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const ts = new Date().toISOString().replace(/[:.]/g, "-");
            a.href = url;
            a.download = `fintrace-data-export-${ts}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            window.alert(
                error instanceof Error
                    ? error.message
                    : "Failed to export data",
            );
        } finally {
            setIsExportingData(false);
        }
    };

    const handleDeleteAllData = async () => {
        if (isDeletingData) return;
        const confirmed = window.confirm(
            "This action permanently deletes all your FinTrace data but keeps your account. Continue?",
        );
        if (!confirmed) return;
        const typed = window.prompt(
            'Type "DELETE_DATA" to confirm deleting all data:',
        );
        if (typed !== "DELETE_DATA") {
            window.alert(
                "Data deletion cancelled: confirmation did not match.",
            );
            return;
        }
        setIsDeletingData(true);
        try {
            const res = await fetch("/api/user/data/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation: "DELETE_DATA" }),
            });
            const json = (await res.json().catch(() => ({}))) as {
                error?: string;
                deleted?: Record<string, number>;
            };
            if (!res.ok) {
                throw new Error(json.error || "Failed to delete all data");
            }
            window.alert("All user data has been deleted successfully.");
        } catch (error) {
            window.alert(
                error instanceof Error
                    ? error.message
                    : "Failed to delete all data",
            );
        } finally {
            setIsDeletingData(false);
        }
    };

    useEffect(() => {
        if (!session?.user?.id) return;
        let active = true;
        setIsLoadingSessions(true);
        fetch("/api/auth/sessions", { cache: "no-store" })
            .then((res) => res.json().then((j) => ({ res, j })))
            .then(({ res, j }) => {
                if (!active) return;
                if (!res.ok) return;
                const list = (j as { sessions?: unknown }).sessions;
                if (Array.isArray(list)) {
                    setSessions(list as any);
                }
            })
            .finally(() => {
                if (active) setIsLoadingSessions(false);
            });
        return () => {
            active = false;
        };
    }, [session?.user?.id]);

    const handleRevokeSession = async (sessionTokenHash: string) => {
        const confirmed = window.confirm("Log out this session?");
        if (!confirmed) return;
        try {
            const res = await fetch("/api/auth/sessions/revoke", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionTokenHash }),
            });
            const json = (await res.json().catch(() => ({}))) as {
                error?: string;
            };
            if (!res.ok)
                throw new Error(json.error || "Failed to revoke session");
            setSessions((prev) =>
                prev.filter((s) => s.sessionTokenHash !== sessionTokenHash),
            );
        } catch (e) {
            window.alert(
                e instanceof Error ? e.message : "Failed to revoke session",
            );
        }
    };

    const sectionMeta: Record<string, { title: string; description: string }> =
        {
            profile: {
                title: t("settingsPage.sectionProfileTitle"),
                description: t("settingsPage.sectionProfileDesc"),
            },
            ai: {
                title: t("settingsPage.sectionAiTitle"),
                description: t("settingsPage.sectionAiDesc"),
            },
            ui: {
                title: t("settingsPage.sectionTypographyTitle"),
                description: t("settingsPage.sectionTypographyDesc"),
            },
            appearance: {
                title: t("settingsPage.sectionAppearanceTitle"),
                description: t("settingsPage.sectionAppearanceDesc"),
            },
            notif: {
                title: t("settingsPage.sectionNotificationsTitle"),
                description: t("settingsPage.sectionNotificationsDesc"),
            },
            integrations: {
                title: t("settingsPage.sectionIntegrationsTitle"),
                description: t("settingsPage.sectionIntegrationsDesc"),
            },
            security: {
                title: t("settingsPage.sectionSecurityTitle"),
                description: t("settingsPage.sectionSecurityDesc"),
            },
            data: {
                title: t("settingsPage.sectionDataTitle"),
                description: t("settingsPage.sectionDataDesc"),
            },
            support: {
                title: t("settingsPage.sectionSupportTitle"),
                description: t("settingsPage.sectionSupportDesc"),
            },
            connectionTest: {
                title: t("settingsPage.sectionConnectionTestTitle"),
                description: t("settingsPage.sectionConnectionTestDesc"),
            },
            connectionStreams: {
                title: t("settingsPage.sectionConnectionStreamsTitle"),
                description: t("settingsPage.sectionConnectionStreamsDesc"),
            },
            connectionProviders: {
                title: t("settingsPage.sectionConnectionProvidersTitle"),
                description: t("settingsPage.sectionConnectionProvidersDesc"),
            },
        };

    const current = sectionMeta[activeSection] ?? {
        title: t("settingsPage.settings"),
        description: "",
    };

    return (
        <SettingsLayout
            activeSection={activeSection}
            onSelect={selectSection}
            pageTitle={current.title}
            pageDescription={current.description}
        >
            {/* ── Profile ── */}
            {activeSection === "profile" && (
                <div className="space-y-0 divide-y divide-[var(--border-color)]">
                    {/* Avatar row */}
                    <SettingsRow
                        label={t("settingsPage.profilePhoto")}
                        description={t("settingsPage.profilePhotoDesc")}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
                                {session?.user?.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <User size={22} className="text-accent" />
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[12px] text-muted">
                                    {session?.user?.name || "Not signed in"}
                                </p>
                            </div>
                        </div>
                    </SettingsRow>

                    {/* Name row */}
                    <SettingsRow
                        label={t("settingsPage.fullName")}
                        description={t("settingsPage.fullNameDesc")}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <FieldInput
                                placeholder={t("settingsPage.firstName")}
                                defaultValue={
                                    session?.user?.name
                                        ?.split(" ")
                                        .slice(0, -1)
                                        .join(" ") || ""
                                }
                            />
                            <FieldInput
                                placeholder={t("settingsPage.lastName")}
                                defaultValue={
                                    session?.user?.name
                                        ?.split(" ")
                                        .slice(-1)
                                        .join(" ") || ""
                                }
                            />
                        </div>
                    </SettingsRow>

                    {/* Email */}
                    <SettingsRow
                        label={t("settingsPage.emailAddress")}
                        description={t("settingsPage.emailAddressDesc")}
                    >
                        <div className="flex gap-2">
                            <FieldInput
                                type="email"
                                defaultValue={session?.user?.email || ""}
                                className="flex-1"
                            />
                            <button className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors whitespace-nowrap">
                                {t("settingsPage.changeEmail")}
                            </button>
                        </div>
                    </SettingsRow>

                    {/* Username */}
                    <SettingsRow
                        label={t("settingsPage.username")}
                        description={t("settingsPage.usernameDesc")}
                    >
                        <FieldInput
                            defaultValue={
                                session?.user?.email?.split("@")[0] || ""
                            }
                        />
                    </SettingsRow>

                    {/* Timezone */}
                    <SettingsRow
                        label={t("settingsPage.timezone")}
                        description={t("settingsPage.timezoneDesc")}
                    >
                        <FieldSelect defaultValue="GMT+7 — Indochina Time">
                            <option>{t("settingsPage.tzUtc")}</option>
                            <option>{t("settingsPage.tzEst")}</option>
                            <option>{t("settingsPage.tzPst")}</option>
                            <option>{t("settingsPage.tzIct")}</option>
                        </FieldSelect>
                    </SettingsRow>

                    {/* Account security header */}
                    <div className="pt-8 pb-4">
                        <p className="text-[11px] uppercase tracking-widest text-muted font-semibold">
                            {t("settingsPage.accountSecurity")}
                        </p>
                    </div>

                    <SettingsRow
                        label={t("settingsPage.password")}
                        description={t("settingsPage.passwordDesc")}
                    >
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value="••••••••••"
                                readOnly
                                className="flex-1 bg-secondary border border-main rounded-lg py-2.5 px-4 text-[14px] focus:outline-none opacity-60 cursor-default"
                            />
                            <button className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors whitespace-nowrap">
                                {t("settingsPage.changePassword")}
                            </button>
                        </div>
                    </SettingsRow>

                    <SettingsRow
                        label={t("settingsPage.twoStepVerification")}
                        description={t("settingsPage.twoStepVerificationDesc")}
                    >
                        <button
                            type="button"
                            onClick={() => selectSection("security")}
                            className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors whitespace-nowrap"
                        >
                            {t("settingsPage.manageTwoFactor")}
                        </button>
                    </SettingsRow>

                    {/* Danger zone */}
                    <div className="pt-8 pb-4">
                        <p className="text-[11px] uppercase tracking-widest text-muted font-semibold">
                            {t("settingsPage.dangerZone")}
                        </p>
                    </div>

                    <SettingsRow
                        label={t("settingsPage.logoutAllDevices")}
                        description={t("settingsPage.logoutAllDevicesDesc")}
                        vertical
                    >
                        <ActiveSessionsPanel
                            t={t}
                            sessions={sessions}
                            isLoadingSessions={isLoadingSessions}
                            isRevokingSessions={isRevokingSessions}
                            onRevokeOtherSessions={handleRevokeOtherSessions}
                            onRevokeSession={handleRevokeSession}
                        />
                    </SettingsRow>

                    <SettingsRow
                        label={t("settingsPage.deleteAccount")}
                        description={t("settingsPage.deleteAccountDesc")}
                        danger
                    >
                        <button
                            type="button"
                            onClick={handleDeleteAccount}
                            disabled={isDeletingAccount}
                            className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isDeletingAccount
                                ? `${t("settingsPage.loading")}...`
                                : t("settingsPage.deleteAccount")}
                        </button>
                    </SettingsRow>
                </div>
            )}

            {/* ── AI Settings ── */}
            {activeSection === "ai" && (
                <div className="space-y-8">
                    {/* Provider keys section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[13px] font-semibold">
                                    {t("settingsPage.aiProviders")}
                                </p>
                                <p className="text-[12px] text-muted mt-0.5">
                                    {t("settingsPage.aiProvidersDesc")}
                                </p>
                            </div>
                            <span className="text-[11px] text-muted bg-secondary border border-main px-2.5 py-1 rounded-full">
                                {t("settingsPage.availableProviders", {
                                    available: availableProviderCount,
                                    total: aiProviders.length,
                                })}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {aiProviders.map((provider) => (
                                <ProviderCard
                                    key={provider.id}
                                    provider={provider}
                                    isBuiltIn={builtInIds.has(provider.id)}
                                    keySource={
                                        provider.apiKey?.trim() ||
                                        userKeyStatus[provider.id]
                                            ? "user"
                                            : serverKeyStatus[provider.id]
                                              ? "platform"
                                              : "none"
                                    }
                                    onKeyChange={(key) =>
                                        setProviderApiKey(provider.id, key)
                                    }
                                    onToggle={(enabled) =>
                                        setProviderEnabled(provider.id, enabled)
                                    }
                                    onRemove={() =>
                                        removeCustomProvider(provider.id)
                                    }
                                />
                            ))}
                            <AddProviderForm onAdd={addCustomProvider} />
                        </div>
                    </div>

                    <div className="border-t border-main" />

                    {/* Default model */}
                    <div className="space-y-0 divide-y divide-[var(--border-color)]">
                        <div className="pb-4">
                            <p className="text-[11px] uppercase tracking-widest text-muted font-semibold">
                                {t("settingsPage.modelDefaults")}
                            </p>
                        </div>

                        <SettingsRow
                            label={t("settingsPage.defaultModel")}
                            description={
                                modelProvider
                                    ? t(
                                          "settingsPage.defaultModelDescWithProvider",
                                          { provider: modelProvider.name },
                                      )
                                    : t("settingsPage.defaultModelDesc")
                            }
                        >
                            <div className="space-y-3">
                                <div className="relative">
                                    <select
                                        value={modelProviderId}
                                        onChange={(e) =>
                                            setModelProviderId(
                                                e.target.value as AIProviderId,
                                            )
                                        }
                                        className="w-full bg-secondary border border-main rounded-lg py-2.5 pl-4 pr-10 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30 appearance-none"
                                    >
                                        {modelProviderOptions.map(
                                            (provider) => (
                                                <option
                                                    key={provider.id}
                                                    value={provider.id}
                                                >
                                                    {provider.name}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <ChevronDown
                                            size={13}
                                            className="text-muted"
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <select
                                        value={modelSelectionValue}
                                        onChange={(e) =>
                                            setSelectedModel(
                                                e.target.value,
                                                modelProvider?.id ??
                                                    activeProviderId,
                                            )
                                        }
                                        disabled={isLoadingModels}
                                        className="w-full bg-secondary border border-main rounded-lg py-2.5 pl-4 pr-10 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30 appearance-none disabled:opacity-60"
                                    >
                                        {models.length === 0 ? (
                                            <option value={modelSelectionValue}>
                                                {modelSelectionValue} (
                                                {t("settingsPage.loading")})
                                            </option>
                                        ) : (
                                            models.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name || m.id}
                                                </option>
                                            ))
                                        )}
                                        {models.length > 0 &&
                                            !models.find(
                                                (m) =>
                                                    m.id ===
                                                    modelSelectionValue,
                                            ) && (
                                                <option
                                                    value={modelSelectionValue}
                                                >
                                                    {modelSelectionValue}
                                                </option>
                                            )}
                                    </select>
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        {isLoadingModels ? (
                                            <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Sparkles
                                                size={13}
                                                className="text-muted"
                                            />
                                        )}
                                    </div>
                                </div>

                                <p className="text-[11px] text-muted">
                                    {modelKeySource === "user"
                                        ? t("settingsPage.modelListPersonalKey")
                                        : modelKeySource === "platform"
                                          ? t(
                                                "settingsPage.modelListPlatformKey",
                                            )
                                          : t("settingsPage.modelListNoKey")}
                                </p>
                            </div>
                        </SettingsRow>

                        <SettingsRow
                            label={t("settingsPage.systemPrompt")}
                            description={
                                <>
                                    {t("settingsPage.systemPromptDesc")}{" "}
                                    <button
                                        onClick={() =>
                                            setSystemPrompt(
                                                DEFAULT_SYSTEM_PROMPT,
                                            )
                                        }
                                        className="text-accent hover:underline"
                                    >
                                        {t("settingsPage.resetToDefault")}
                                    </button>
                                </>
                            }
                            vertical
                        >
                            <textarea
                                rows={10}
                                value={systemPrompt}
                                onChange={(e) =>
                                    setSystemPrompt(e.target.value)
                                }
                                className="w-full bg-secondary border border-main rounded-lg py-3 px-4 text-[13px] font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent/30 resize-y"
                            />
                            <p className="text-[11px] text-muted mt-1.5">
                                {t("settingsPage.useContextPrefix")}{" "}
                                <code className="bg-main border border-main px-1 py-0.5 rounded text-[11px]">
                                    {"{CONTEXT}"}
                                </code>{" "}
                                {t("settingsPage.useContextSuffix")}
                            </p>
                        </SettingsRow>
                    </div>
                </div>
            )}

            {/* ── Integrations ── */}
            {activeSection === "integrations" && (
                <div className="space-y-0 divide-y divide-[var(--border-color)]">
                    <SettingsRow
                        label="CryptoPanic"
                        description={
                            <>
                                {t("settingsPage.cryptoPanicDesc")}{" "}
                                <a
                                    href="https://cryptopanic.com/developers/api/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-accent hover:underline inline-flex items-center gap-0.5"
                                >
                                    {t("settingsPage.getToken")}
                                    <ExternalLink size={10} />
                                </a>
                            </>
                        }
                    >
                        <ApiKeyInput
                            value={cryptoPanicApiKey}
                            placeholder={t(
                                "settingsPage.cryptoPanicPlaceholder",
                            )}
                            onChange={setCryptoPanicApiKey}
                        />
                    </SettingsRow>
                </div>
            )}

            {/* ── Typography ── */}
            {activeSection === "ui" && (
                <div className="space-y-3">
                    {FONT_OPTIONS.map(({ value }) => {
                        const isActive = font === value;
                        const fontDescription =
                            value === "Inter"
                                ? t("settingsPage.fontInterDesc")
                                : value === "Outfit"
                                  ? t("settingsPage.fontOutfitDesc")
                                  : value === "Plus Jakarta Sans"
                                    ? t("settingsPage.fontPlusJakartaDesc")
                                    : value === "IBM Plex Sans"
                                      ? t("settingsPage.fontIbmPlexDesc")
                                      : t("settingsPage.fontSpaceGroteskDesc");
                        return (
                            <button
                                key={value}
                                onClick={() => setFont(value)}
                                className={cn(
                                    "w-full flex items-center gap-5 p-5 rounded-2xl border-2 transition-all text-left",
                                    isActive
                                        ? "border-accent bg-accent/5"
                                        : "border-main bg-secondary hover:border-accent/40",
                                )}
                            >
                                {/* Big preview */}
                                <div
                                    className="text-[36px] font-semibold leading-none text-main w-12 shrink-0 text-center"
                                    style={{ fontFamily: FONT_STACKS[value] }}
                                >
                                    Aa
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className="text-[15px] font-semibold mb-0.5"
                                        style={{
                                            fontFamily: FONT_STACKS[value],
                                        }}
                                    >
                                        {value}
                                    </p>
                                    <p
                                        className="text-[12px] text-muted"
                                        style={{
                                            fontFamily: FONT_STACKS[value],
                                        }}
                                    >
                                        {fontDescription}
                                    </p>
                                    <p
                                        className="text-[11px] text-muted/70 mt-1 tracking-wide"
                                        style={{
                                            fontFamily: FONT_STACKS[value],
                                        }}
                                    >
                                        ABCDEFGHIJKLMNOPQRSTUVWXYZ · 0123456789
                                    </p>
                                </div>
                                <div
                                    className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                        isActive
                                            ? "border-accent bg-accent"
                                            : "border-main",
                                    )}
                                >
                                    {isActive && (
                                        <Check
                                            size={11}
                                            strokeWidth={3}
                                            className="text-white"
                                        />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Appearance ── */}
            {activeSection === "appearance" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {THEME_OPTIONS.map((themeOption) => {
                            const isActive = theme === themeOption.value;
                            const themeLabel =
                                themeOption.value === "light"
                                    ? t("theme.light")
                                    : themeOption.value === "dark1"
                                      ? t("theme.dark1")
                                      : themeOption.value === "dark2"
                                        ? t("theme.dark2")
                                        : themeOption.value === "dark3"
                                          ? t("theme.dark3")
                                          : themeOption.value === "dark4"
                                            ? t("theme.dark4")
                                            : t("theme.dark5");
                            return (
                                <button
                                    key={themeOption.value}
                                    onClick={() => setTheme(themeOption.value)}
                                    className={cn(
                                        "relative rounded-2xl overflow-hidden border-2 transition-all text-left",
                                        isActive
                                            ? "border-accent shadow-md shadow-accent/20"
                                            : "border-main hover:border-accent/40",
                                    )}
                                >
                                    {/* Swatch */}
                                    <div
                                        className="h-24 p-3.5 flex flex-col justify-between"
                                        style={{
                                            backgroundColor: themeOption.bg,
                                        }}
                                    >
                                        {/* Simulated sidebar + content */}
                                        <div className="flex gap-1.5">
                                            <div className="flex flex-col gap-1 w-5 shrink-0">
                                                {[14, 10, 12].map((w, i) => (
                                                    <div
                                                        key={i}
                                                        className="h-1 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                themeOption.border,
                                                            width: w,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="flex-1 flex flex-col gap-1">
                                                <div
                                                    className="h-1 rounded-full w-full"
                                                    style={{
                                                        backgroundColor:
                                                            themeOption.secondaryBg,
                                                    }}
                                                />
                                                <div
                                                    className="h-1 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            "#007AFF",
                                                        width: "40%",
                                                    }}
                                                />
                                                <div className="flex gap-1">
                                                    <div
                                                        className="h-1 rounded-full flex-1"
                                                        style={{
                                                            backgroundColor:
                                                                themeOption.secondaryBg,
                                                        }}
                                                    />
                                                    <div className="h-1 w-4 rounded-full bg-emerald-500/80" />
                                                </div>
                                                <div className="flex gap-1">
                                                    <div
                                                        className="h-1 rounded-full flex-1"
                                                        style={{
                                                            backgroundColor:
                                                                themeOption.secondaryBg,
                                                        }}
                                                    />
                                                    <div className="h-1 w-3 rounded-full bg-rose-500/80" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Label bar */}
                                    <div
                                        className="px-3 py-2.5 flex items-center justify-between"
                                        style={{
                                            backgroundColor:
                                                themeOption.secondaryBg,
                                            borderTop: `1px solid ${themeOption.border}`,
                                        }}
                                    >
                                        <span
                                            className="text-[12px] font-semibold"
                                            style={{ color: themeOption.text }}
                                        >
                                            {themeLabel}
                                        </span>
                                        {isActive ? (
                                            <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                                                <Check
                                                    size={9}
                                                    strokeWidth={3}
                                                    className="text-white"
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className="w-4 h-4 rounded-full border-2"
                                                style={{
                                                    borderColor:
                                                        themeOption.border,
                                                }}
                                            />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Notifications ── */}
            {activeSection === "notif" && (
                <div className="space-y-0 divide-y divide-[var(--border-color)]">
                    <div className="pb-4">
                        <p className="text-[11px] uppercase tracking-widest text-muted font-semibold">
                            {t("settingsPage.pushNotifications")}
                        </p>
                    </div>
                    {[
                        {
                            label: t("settingsPage.priceAlerts"),
                            desc: t("settingsPage.priceAlertsDesc"),
                            on: true,
                        },
                        {
                            label: t("settingsPage.portfolioReports"),
                            desc: t("settingsPage.portfolioReportsDesc"),
                            on: false,
                        },
                        {
                            label: t("settingsPage.breakingMarketNews"),
                            desc: t("settingsPage.breakingMarketNewsDesc"),
                            on: true,
                        },
                        {
                            label: t("settingsPage.aiInsights"),
                            desc: t("settingsPage.aiInsightsDesc"),
                            on: false,
                        },
                    ].map((n) => (
                        <SettingsRow
                            key={n.label}
                            label={n.label}
                            description={n.desc}
                        >
                            <Toggle checked={n.on} onChange={() => undefined} />
                        </SettingsRow>
                    ))}
                </div>
            )}

            {/* ── Security ── */}
            {activeSection === "security" && (
                <div className="space-y-0 divide-y divide-[var(--border-color)]">
                    <SettingsRow
                        label={t("settingsPage.twoFactorAuthentication")}
                        description={t(
                            "settingsPage.twoFactorAuthenticationDesc",
                        )}
                        vertical
                    >
                        <TwoFactorSettingsPanel />
                    </SettingsRow>
                    <SettingsRow
                        label={t("settingsPage.activeSessions")}
                        description={t("settingsPage.activeSessionsDesc")}
                        vertical
                    >
                        <ActiveSessionsPanel
                            t={t}
                            sessions={sessions}
                            isLoadingSessions={isLoadingSessions}
                            isRevokingSessions={isRevokingSessions}
                            onRevokeOtherSessions={handleRevokeOtherSessions}
                            onRevokeSession={handleRevokeSession}
                        />
                    </SettingsRow>
                    <SettingsRow
                        label={t("settingsPage.apiAccessTokens")}
                        description={t("settingsPage.apiAccessTokensDesc")}
                    >
                        <button className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors">
                            {t("settingsPage.viewTokens")}
                        </button>
                    </SettingsRow>
                </div>
            )}

            {/* ── Data & Privacy ── */}
            {activeSection === "data" && (
                <div className="space-y-0 divide-y divide-[var(--border-color)]">
                    <SettingsRow
                        label={t("settingsPage.analyticsTelemetry")}
                        description={t("settingsPage.analyticsTelemetryDesc")}
                    >
                        <Toggle
                            checked={analyticsTelemetryEnabled}
                            onChange={setAnalyticsTelemetryEnabled}
                        />
                    </SettingsRow>
                    <SettingsRow
                        label={t("settingsPage.dataExport")}
                        description={t("settingsPage.dataExportDesc")}
                    >
                        <button
                            type="button"
                            onClick={handleRequestDataExport}
                            disabled={isExportingData}
                            className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isExportingData
                                ? `${t("settingsPage.loading")}...`
                                : t("settingsPage.requestExport")}
                        </button>
                    </SettingsRow>
                    <SettingsRow
                        label={t("settingsPage.deleteAllData")}
                        description={t("settingsPage.deleteAllDataDesc")}
                        danger
                    >
                        <button
                            type="button"
                            onClick={handleDeleteAllData}
                            disabled={isDeletingData}
                            className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isDeletingData
                                ? `${t("settingsPage.loading")}...`
                                : t("settingsPage.deleteData")}
                        </button>
                    </SettingsRow>
                </div>
            )}

            {/* ── Support Access ── */}
            {activeSection === "support" && (
                <div className="space-y-0 divide-y divide-[var(--border-color)]">
                    <SettingsRow
                        label={t("settingsPage.supportAccess")}
                        description={t("settingsPage.supportAccessDesc")}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-[12px] text-muted">
                                {t("settingsPage.supportUntil")}
                            </span>
                            <Toggle
                                checked={supportAccessEnabled}
                                onChange={setSupportAccessEnabled}
                            />
                        </div>
                    </SettingsRow>
                    <SettingsRow
                        label={t("settingsPage.contactSupport")}
                        description={t("settingsPage.contactSupportDesc")}
                    >
                        <a
                            href="mailto:ismethanhtung@gmail.com"
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors"
                        >
                            <Mail size={13} />
                            {t("settingsPage.sendEmail")}
                        </a>
                    </SettingsRow>
                </div>
            )}

            {activeSection === "connectionTest" && <ConnectionTestPanel />}

            {activeSection === "connectionStreams" && (
                <div className="rounded-xl border border-dashed border-main bg-secondary/20 p-8">
                    <p className="mb-2 inline-flex rounded-full border border-main bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {t("settingsLayout.badgeSoon")}
                    </p>
                    <p className="max-w-2xl text-[13px] leading-relaxed text-muted">
                        {t("settingsPage.connectionStreamsPlaceholderBody")}
                    </p>
                </div>
            )}

            {activeSection === "connectionProviders" && (
                <div className="rounded-xl border border-dashed border-main bg-secondary/20 p-8">
                    <p className="mb-2 inline-flex rounded-full border border-main bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {t("settingsLayout.badgeSoon")}
                    </p>
                    <p className="max-w-2xl text-[13px] leading-relaxed text-muted">
                        {t("settingsPage.connectionProvidersPlaceholderBody")}
                    </p>
                </div>
            )}
        </SettingsLayout>
    );
}
