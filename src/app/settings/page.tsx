"use client";

import React, { useEffect, useState } from "react";
import SettingsLayout from "../../components/SettingsLayout";
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
import { cn } from "../../lib/utils";
import { aiProviderService, ModelInfo } from "../../services/aiProviderService";
import { getFallbackModelsForProvider } from "../../lib/aiModelDefaults";

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
    <div className={cn("py-5", vertical ? "space-y-3" : "flex items-start justify-between gap-8")}>
        <div className="min-w-0 flex-1">
            <p className={cn("text-[14px] font-medium", danger ? "text-rose-500" : "text-main")}>
                {label}
            </p>
            {description && (
                <p className="text-[12px] text-muted mt-0.5 leading-relaxed">{description}</p>
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
    const [expanded, setExpanded] = useState(false);
    const hasKey = keySource !== "none";
    const statusLabel =
        keySource === "user"
            ? "personal key"
            : keySource === "platform"
              ? "platform key"
              : "no key";

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
                            title="Remove provider"
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
                <div className="px-4 pb-4 space-y-3 border-t border-main/50 pt-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                            API Key
                        </label>
                        <ApiKeyInput
                            value={provider.apiKey}
                            placeholder={provider.placeholder}
                            onChange={onKeyChange}
                        />
                        <p className="text-[11px] text-muted">
                            {keySource === "user"
                                ? "Using your personal API key. It overrides the platform key."
                                : keySource === "platform"
                                  ? "No personal key entered. FinTrace is currently using the platform key for this provider."
                                  : "No key available yet. Add your own key or configure the platform key on the server."}
                        </p>
                    </div>
                    <p className="text-[11px] text-muted">
                        Get your key at{" "}
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
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        id: "",
        name: "",
        apiKey: "",
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
            placeholder: form.placeholder || "your-api-key",
            websiteUrl: form.websiteUrl.trim(),
            description: form.description.trim(),
        });
        setForm({
            id: "",
            name: "",
            apiKey: "",
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
                <span>Add Custom Provider</span>
            </button>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="p-5 rounded-xl border border-accent/30 bg-accent/5 space-y-4"
        >
            <h4 className="text-[13px] font-bold text-main">
                Add Custom Provider
            </h4>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                        Provider ID *
                    </label>
                    <input
                        required
                        placeholder="e.g. mistral"
                        value={form.id}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, id: e.target.value }))
                        }
                        className="w-full bg-main border border-main rounded-lg py-2 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                        Display Name *
                    </label>
                    <input
                        required
                        placeholder="e.g. Mistral AI"
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
                    API Key
                </label>
                <ApiKeyInput
                    value={form.apiKey}
                    placeholder="your-api-key"
                    onChange={(v) => setForm((f) => ({ ...f, apiKey: v }))}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    Website URL
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
                    Description
                </label>
                <input
                    placeholder="Short description"
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
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-[12px] rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 transition-colors"
                >
                    Add Provider
                </button>
            </div>
        </form>
    );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const {
        font,
        setFont,
        theme,
        setTheme,
        aiProviders,
        setProviderApiKey,
        setProviderEnabled,
        addCustomProvider,
        removeCustomProvider,
        activeProviderId,
        activeProvider,
        serverKeyStatus,
        cryptoPanicApiKey,
        setCryptoPanicApiKey,
        getSelectedModel,
        setSelectedModel,
        systemPrompt,
        setSystemPrompt,
    } = useAppSettings();

    const [activeSection, setActiveSection] = useState("profile");
    const [modelProviderId, setModelProviderId] =
        useState<AIProviderId>(activeProviderId);
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const modelProvider =
        aiProviders.find((provider) => provider.id === modelProviderId) ??
        activeProvider;
    const modelSelectionValue = getSelectedModel(modelProvider?.id ?? activeProviderId);
    const modelKeySource = modelProvider?.apiKey?.trim()
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
            .getModels(modelProvider.id, modelProvider.apiKey)
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
    }, [
        modelProvider,
        modelProviderId,
        modelSelectionValue,
        setSelectedModel,
    ]);

    const builtInIds = new Set(BUILT_IN_PROVIDERS.map((p) => p.id));
    const availableProviderCount = aiProviders.filter(
        (provider) =>
            Boolean(provider.apiKey?.trim()) || Boolean(serverKeyStatus[provider.id]),
    ).length;
    const modelProviderOptions = aiProviders;

    const sectionMeta: Record<string, { title: string; description: string }> = {
        profile: { title: "My Profile", description: "Update your personal details and account information." },
        ai: { title: "AI Settings", description: "Configure AI providers, default model, and system prompt." },
        ui: { title: "Typography", description: "Choose the interface font. Changes apply immediately." },
        appearance: { title: "Appearance", description: "Select a color theme that suits your workflow." },
        notif: { title: "Notifications", description: "Manage alerts and notification preferences." },
        integrations: { title: "Integrations", description: "Connect external data providers to FinTrace." },
        security: { title: "Security", description: "Manage account security and access settings." },
        data: { title: "Data & Privacy", description: "Control how your data is stored and used." },
        support: { title: "Support Access", description: "Manage support team access to your account." },
    };

    const current = sectionMeta[activeSection] ?? { title: "Settings", description: "" };

    return (
        <SettingsLayout
            activeSection={activeSection}
            onSelect={setActiveSection}
            pageTitle={current.title}
            pageDescription={current.description}
        >
            {/* ── Profile ── */}
            {activeSection === "profile" && (
                <div className="space-y-0 divide-y divide-[var(--border-color)]">
                    {/* Avatar row */}
                    <SettingsRow
                        label="Profile photo"
                        description="Your avatar shown across the app."
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center shrink-0">
                                <User size={22} className="text-accent" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <button className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors">
                                    Change photo
                                </button>
                                <button className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors">
                                    Remove
                                </button>
                            </div>
                        </div>
                    </SettingsRow>

                    {/* Name row */}
                    <SettingsRow label="Full name" description="Your display name across FinTrace.">
                        <div className="grid grid-cols-2 gap-3">
                            <FieldInput placeholder="First name" defaultValue="Brian" />
                            <FieldInput placeholder="Last name" defaultValue="Frederin" />
                        </div>
                    </SettingsRow>

                    {/* Email */}
                    <SettingsRow label="Email address" description="Used for notifications and login.">
                        <div className="flex gap-2">
                            <FieldInput type="email" defaultValue="brian@fintrace.io" className="flex-1" />
                            <button className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors whitespace-nowrap">
                                Change email
                            </button>
                        </div>
                    </SettingsRow>

                    {/* Username */}
                    <SettingsRow label="Username" description="Unique identifier in the platform.">
                        <FieldInput defaultValue="brian_fintrace" />
                    </SettingsRow>

                    {/* Timezone */}
                    <SettingsRow label="Timezone" description="Used for time-based alerts and reports.">
                        <FieldSelect defaultValue="GMT+7 — Indochina Time">
                            <option>UTC — Coordinated Universal Time</option>
                            <option>EST — Eastern Standard Time</option>
                            <option>PST — Pacific Standard Time</option>
                            <option>GMT+7 — Indochina Time</option>
                        </FieldSelect>
                    </SettingsRow>

                    {/* Account security header */}
                    <div className="pt-8 pb-4">
                        <p className="text-[11px] uppercase tracking-widest text-muted font-semibold">
                            Account security
                        </p>
                    </div>

                    <SettingsRow label="Password" description="Last changed 3 months ago.">
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value="••••••••••"
                                readOnly
                                className="flex-1 bg-secondary border border-main rounded-lg py-2.5 px-4 text-[14px] focus:outline-none opacity-60 cursor-default"
                            />
                            <button className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors whitespace-nowrap">
                                Change password
                            </button>
                        </div>
                    </SettingsRow>

                    <SettingsRow
                        label="2-Step verification"
                        description="Add an extra layer of security to your account during login."
                    >
                        <Toggle checked={true} onChange={() => undefined} />
                    </SettingsRow>

                    {/* Danger zone */}
                    <div className="pt-8 pb-4">
                        <p className="text-[11px] uppercase tracking-widest text-muted font-semibold">
                            Danger zone
                        </p>
                    </div>

                    <SettingsRow
                        label="Log out of all devices"
                        description="Log out of all other active sessions on other devices besides this one."
                    >
                        <button className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors">
                            Log out all
                        </button>
                    </SettingsRow>

                    <SettingsRow
                        label="Delete account"
                        description="Permanently delete your account and all associated data."
                        danger
                    >
                        <button className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 transition-colors">
                            Delete account
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
                                <p className="text-[13px] font-semibold">AI Providers</p>
                                <p className="text-[12px] text-muted mt-0.5">
                                    Configure API keys. Toggle providers on/off in the chat panel.
                                </p>
                            </div>
                            <span className="text-[11px] text-muted bg-secondary border border-main px-2.5 py-1 rounded-full">
                                {availableProviderCount} / {aiProviders.length} available
                            </span>
                        </div>
                        <div className="space-y-2">
                            {aiProviders.map((provider) => (
                                <ProviderCard
                                    key={provider.id}
                                    provider={provider}
                                    isBuiltIn={builtInIds.has(provider.id)}
                                    keySource={
                                        provider.apiKey?.trim()
                                            ? "user"
                                            : serverKeyStatus[provider.id]
                                              ? "platform"
                                              : "none"
                                    }
                                    onKeyChange={(key) => setProviderApiKey(provider.id, key)}
                                    onToggle={(enabled) => setProviderEnabled(provider.id, enabled)}
                                    onRemove={() => removeCustomProvider(provider.id)}
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
                                Model defaults
                            </p>
                        </div>

                        <SettingsRow
                            label="Default model"
                            description={
                                modelProvider
                                    ? `${modelProvider.name} model used whenever this provider is selected in AI features.`
                                    : "Choose the default model for a provider."
                            }
                        >
                            <div className="space-y-3">
                                <div className="relative">
                                    <select
                                        value={modelProviderId}
                                        onChange={(e) =>
                                            setModelProviderId(e.target.value as AIProviderId)
                                        }
                                        className="w-full bg-secondary border border-main rounded-lg py-2.5 pl-4 pr-10 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30 appearance-none"
                                    >
                                        {modelProviderOptions.map((provider) => (
                                            <option key={provider.id} value={provider.id}>
                                                {provider.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <ChevronDown size={13} className="text-muted" />
                                    </div>
                                </div>

                                <div className="relative">
                                    <select
                                        value={modelSelectionValue}
                                        onChange={(e) =>
                                            setSelectedModel(
                                                e.target.value,
                                                modelProvider?.id ?? activeProviderId,
                                            )
                                        }
                                        disabled={isLoadingModels}
                                        className="w-full bg-secondary border border-main rounded-lg py-2.5 pl-4 pr-10 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent/30 appearance-none disabled:opacity-60"
                                    >
                                        {models.length === 0 ? (
                                            <option value={modelSelectionValue}>
                                                {modelSelectionValue} (loading…)
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
                                                (m) => m.id === modelSelectionValue,
                                            ) && (
                                                <option value={modelSelectionValue}>
                                                    {modelSelectionValue}
                                                </option>
                                            )}
                                    </select>
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        {isLoadingModels ? (
                                            <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Sparkles size={13} className="text-muted" />
                                        )}
                                    </div>
                                </div>

                                <p className="text-[11px] text-muted">
                                    {modelKeySource === "user"
                                        ? "Model list is loaded with your personal API key."
                                        : modelKeySource === "platform"
                                          ? "Model list is loaded with the FinTrace platform key."
                                          : "No key is available for this provider, so FinTrace is showing a curated fallback list."}
                                </p>
                            </div>
                        </SettingsRow>

                        <SettingsRow
                            label="System prompt"
                            description={
                                <>
                                    Injected at the start of every chat.{" "}
                                    <button
                                        onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                                        className="text-accent hover:underline"
                                    >
                                        Reset to default
                                    </button>
                                </>
                            }
                            vertical
                        >
                            <textarea
                                rows={10}
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                className="w-full bg-secondary border border-main rounded-lg py-3 px-4 text-[13px] font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent/30 resize-y"
                            />
                            <p className="text-[11px] text-muted mt-1.5">
                                Use{" "}
                                <code className="bg-main border border-main px-1 py-0.5 rounded text-[11px]">
                                    {"{CONTEXT}"}
                                </code>{" "}
                                to inject live market data automatically.
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
                                Auth token for real-time crypto news.{" "}
                                <a
                                    href="https://cryptopanic.com/developers/api/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-accent hover:underline inline-flex items-center gap-0.5"
                                >
                                    Get token
                                    <ExternalLink size={10} />
                                </a>
                            </>
                        }
                    >
                        <ApiKeyInput
                            value={cryptoPanicApiKey}
                            placeholder="Your free api auth token..."
                            onChange={setCryptoPanicApiKey}
                        />
                    </SettingsRow>
                </div>
            )}

            {/* ── Typography ── */}
            {activeSection === "ui" && (
                <div className="space-y-3">
                    {FONT_OPTIONS.map(({ value, description }) => {
                        const isActive = font === value;
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
                                        style={{ fontFamily: FONT_STACKS[value] }}
                                    >
                                        {value}
                                    </p>
                                    <p
                                        className="text-[12px] text-muted"
                                        style={{ fontFamily: FONT_STACKS[value] }}
                                    >
                                        {description}
                                    </p>
                                    <p
                                        className="text-[11px] text-muted/70 mt-1 tracking-wide"
                                        style={{ fontFamily: FONT_STACKS[value] }}
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
                                    {isActive && <Check size={11} strokeWidth={3} className="text-white" />}
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
                        {THEME_OPTIONS.map((t) => {
                            const isActive = theme === t.value;
                            return (
                                <button
                                    key={t.value}
                                    onClick={() => setTheme(t.value)}
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
                                        style={{ backgroundColor: t.bg }}
                                    >
                                        {/* Simulated sidebar + content */}
                                        <div className="flex gap-1.5">
                                            <div className="flex flex-col gap-1 w-5 shrink-0">
                                                {[14, 10, 12].map((w, i) => (
                                                    <div key={i} className="h-1 rounded-full" style={{ backgroundColor: t.border, width: w }} />
                                                ))}
                                            </div>
                                            <div className="flex-1 flex flex-col gap-1">
                                                <div className="h-1 rounded-full w-full" style={{ backgroundColor: t.secondaryBg }} />
                                                <div className="h-1 rounded-full" style={{ backgroundColor: "#007AFF", width: "40%" }} />
                                                <div className="flex gap-1">
                                                    <div className="h-1 rounded-full flex-1" style={{ backgroundColor: t.secondaryBg }} />
                                                    <div className="h-1 w-4 rounded-full bg-emerald-500/80" />
                                                </div>
                                                <div className="flex gap-1">
                                                    <div className="h-1 rounded-full flex-1" style={{ backgroundColor: t.secondaryBg }} />
                                                    <div className="h-1 w-3 rounded-full bg-rose-500/80" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Label bar */}
                                    <div
                                        className="px-3 py-2.5 flex items-center justify-between"
                                        style={{ backgroundColor: t.secondaryBg, borderTop: `1px solid ${t.border}` }}
                                    >
                                        <span className="text-[12px] font-semibold" style={{ color: t.text }}>
                                            {t.label}
                                        </span>
                                        {isActive ? (
                                            <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                                                <Check size={9} strokeWidth={3} className="text-white" />
                                            </div>
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: t.border }} />
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
                            Push notifications
                        </p>
                    </div>
                    {[
                        {
                            label: "Price alerts",
                            desc: "Get notified when an asset hits your target price.",
                            on: true,
                        },
                        {
                            label: "Portfolio reports",
                            desc: "Daily performance summary of your portfolio.",
                            on: false,
                        },
                        {
                            label: "Breaking market news",
                            desc: "Breaking news affecting your watched assets.",
                            on: true,
                        },
                        {
                            label: "AI insights",
                            desc: "AI-generated signals and pattern detections.",
                            on: false,
                        },
                    ].map((n) => (
                        <SettingsRow key={n.label} label={n.label} description={n.desc}>
                            <Toggle checked={n.on} onChange={() => undefined} />
                        </SettingsRow>
                    ))}
                </div>
            )}

            {/* ── Security ── */}
            {activeSection === "security" && (
                <div className="space-y-0 divide-y divide-[var(--border-color)]">
                    <SettingsRow
                        label="Two-factor authentication"
                        description="Protect your account with an authenticator app."
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-[12px] text-emerald-500 font-medium">Enabled</span>
                            <Toggle checked={true} onChange={() => undefined} />
                        </div>
                    </SettingsRow>
                    <SettingsRow
                        label="Active sessions"
                        description="2 devices currently logged in."
                    >
                        <button className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors">
                            Manage sessions
                        </button>
                    </SettingsRow>
                    <SettingsRow
                        label="API access tokens"
                        description="Tokens for programmatic access to your data."
                    >
                        <button className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors">
                            View tokens
                        </button>
                    </SettingsRow>
                </div>
            )}

            {/* ── Data & Privacy ── */}
            {activeSection === "data" && (
                <div className="space-y-0 divide-y divide-[var(--border-color)]">
                    <SettingsRow
                        label="Analytics & telemetry"
                        description="Help improve FinTrace by sharing anonymous usage data."
                    >
                        <Toggle checked={true} onChange={() => undefined} />
                    </SettingsRow>
                    <SettingsRow
                        label="Data export"
                        description="Download a full copy of your FinTrace data."
                    >
                        <button className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors">
                            Request export
                        </button>
                    </SettingsRow>
                    <SettingsRow
                        label="Delete all data"
                        description="Permanently erase all your data. This cannot be undone."
                        danger
                    >
                        <button className="px-4 py-2.5 text-[13px] font-medium rounded-lg border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 transition-colors">
                            Delete data
                        </button>
                    </SettingsRow>
                </div>
            )}

            {/* ── Support Access ── */}
            {activeSection === "support" && (
                <div className="space-y-0 divide-y divide-[var(--border-color)]">
                    <SettingsRow
                        label="Support access"
                        description="Allow the FinTrace team to access your account for support purposes."
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-[12px] text-muted">Until Aug 31, 2026</span>
                            <Toggle checked={true} onChange={() => undefined} />
                        </div>
                    </SettingsRow>
                    <SettingsRow
                        label="Contact support"
                        description="Reach out to the team directly."
                    >
                        <a
                            href="mailto:support@fintrace.io"
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-lg border border-main text-muted hover:text-main hover:bg-secondary transition-colors"
                        >
                            <Mail size={13} />
                            Send email
                        </a>
                    </SettingsRow>
                </div>
            )}
        </SettingsLayout>
    );
}
