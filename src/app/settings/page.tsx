"use client";

import React, { useState } from "react";
import PageLayout from "../../components/PageLayout";
import {
    Settings,
    User,
    Bell,
    Shield,
    Database,
    Globe,
    Type,
    Palette,
    Check,
    Eye,
    EyeOff,
    Plus,
    Trash2,
    ToggleLeft,
    ToggleRight,
    ExternalLink,
    KeyRound,
    ChevronDown,
} from "lucide-react";
import {
    useAppSettings,
    AppFont,
    AppTheme,
    FONT_STACKS,
    THEME_CYCLE,
    BUILT_IN_PROVIDERS,
    AIProviderConfig,
    AIProviderId,
} from "../../context/AppSettingsContext";
import { cn } from "../../lib/utils";
import { openrouterService } from "../../services/openrouterService";

// ─── Fallback models for when API fetch fails ─────────────────────────────────
const FALLBACK_OPENROUTER_MODELS: { id: string; name?: string }[] = [
    { id: "arcee-ai/trinity-large-preview:free", name: "Arcee Trinity Large (Free)" },
    { id: "google/gemini-2.0-flash-lite-001", name: "Gemini 2.0 Flash Lite" },
    { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
    { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku" },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "openai/gpt-4o", name: "GPT-4o" },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
    { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct" },
    { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B Instruct" },
];

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

// ─── Sidebar sections ────────────────────────────────────────────────────────
const SIDEBAR_SECTIONS = [
    { id: "profile", icon: User, label: "Profile" },
    { id: "ui", icon: Type, label: "UI Preferences" },
    { id: "appearance", icon: Palette, label: "Appearance" },
    { id: "integrations", icon: Globe, label: "Integrations & AI" },
    { id: "notif", icon: Bell, label: "Notifications" },
    { id: "security", icon: Shield, label: "Security" },
    { id: "data", icon: Database, label: "Data & Privacy" },
];

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
    onKeyChange,
    onToggle,
    onRemove,
}: {
    provider: AIProviderConfig;
    isBuiltIn: boolean;
    onKeyChange: (key: string) => void;
    onToggle: (enabled: boolean) => void;
    onRemove: () => void;
}) => {
    const [expanded, setExpanded] = useState(false);
    const hasKey = !!provider.apiKey;

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
                            {hasKey && (
                                <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                    configured
                                </span>
                            )}
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
                    </div>
                    <p className="text-[11px] text-muted">
                        Get your key at{" "}
                        <a
                            href={provider.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline inline-flex items-center gap-0.5"
                        >
                            {provider.websiteUrl.replace("https://", "").split("/")[0]}
                            <ExternalLink size={10} />
                        </a>
                    </p>
                </div>
            )}
        </div>
    );
};

// ─── Add Custom Provider Modal ────────────────────────────────────────────────
const AddProviderForm = ({ onAdd }: { onAdd: (p: Omit<AIProviderConfig, "enabled">) => void }) => {
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
        setForm({ id: "", name: "", apiKey: "", placeholder: "your-api-key", websiteUrl: "", description: "" });
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
            <h4 className="text-[13px] font-bold text-main">Add Custom Provider</h4>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                        Provider ID *
                    </label>
                    <input
                        required
                        placeholder="e.g. mistral"
                        value={form.id}
                        onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
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
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                    onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
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
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
        cryptoPanicApiKey,
        setCryptoPanicApiKey,
        selectedModel,
        setSelectedModel,
        systemPrompt,
        setSystemPrompt,
        openrouterApiKey,
    } = useAppSettings();

    const [activeSection, setActiveSection] = useState("profile");
    const [models, setModels] = useState<{ id: string; name?: string }[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Fetch OpenRouter models for model selector
    React.useEffect(() => {
        setIsLoadingModels(true);
        openrouterService
            .getModels(openrouterApiKey)
            .then((list) => setModels(list))
            .catch((err) => {
                console.warn("Failed to load OR models, using fallback:", err);
                setModels(FALLBACK_OPENROUTER_MODELS);
            })
            .finally(() => setIsLoadingModels(false));
    }, [openrouterApiKey]);

    const builtInIds = new Set(BUILT_IN_PROVIDERS.map((p) => p.id));

    return (
        <PageLayout title="Settings">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* ── Sidebar ── */}
                <div className="md:col-span-1 space-y-1">
                    {SIDEBAR_SECTIONS.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id)}
                            className={cn(
                                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors text-[14px] font-medium",
                                activeSection === s.id
                                    ? "bg-accent/10 text-accent"
                                    : "text-muted hover:bg-secondary hover:text-main",
                            )}
                        >
                            <s.icon size={18} />
                            <span>{s.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Content ── */}
                <div className="md:col-span-3 space-y-8">
                    {/* ── Profile ── */}
                    {activeSection === "profile" && (
                        <div className="p-8 bg-secondary rounded-2xl border border-main space-y-8">
                            <div className="flex items-center justify-between border-b border-main pb-6">
                                <div>
                                    <h3 className="text-[18px] font-bold">
                                        Profile Information
                                    </h3>
                                    <p className="text-muted text-[13px]">
                                        Update your personal details here.
                                    </p>
                                </div>
                                <button className="px-6 py-2 bg-accent text-white rounded-lg text-[13px] font-semibold hover:bg-accent/90 transition-colors shadow-sm">
                                    Save Changes
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    {
                                        label: "Full Name",
                                        type: "text",
                                        value: "John Doe",
                                    },
                                    {
                                        label: "Email Address",
                                        type: "email",
                                        value: "john.doe@fintrace.io",
                                    },
                                    {
                                        label: "Username",
                                        type: "text",
                                        value: "johndoe_trader",
                                    },
                                ].map((f) => (
                                    <div key={f.label} className="space-y-2">
                                        <label className="text-[12px] font-bold text-muted uppercase tracking-wider">
                                            {f.label}
                                        </label>
                                        <input
                                            type={f.type}
                                            defaultValue={f.value}
                                            className="w-full bg-main border border-main rounded-lg py-2.5 px-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                                        />
                                    </div>
                                ))}
                                <div className="space-y-2">
                                    <label className="text-[12px] font-bold text-muted uppercase tracking-wider">
                                        Timezone
                                    </label>
                                    <select className="w-full bg-main border border-main rounded-lg py-2.5 px-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-accent/30">
                                        <option>
                                            UTC (Coordinated Universal Time)
                                        </option>
                                        <option>
                                            EST (Eastern Standard Time)
                                        </option>
                                        <option>
                                            PST (Pacific Standard Time)
                                        </option>
                                        <option>GMT+7 (Indochina Time)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── UI Preferences (Font Picker) ── */}
                    {activeSection === "ui" && (
                        <div className="space-y-6">
                            <div className="p-8 bg-secondary rounded-2xl border border-main space-y-6">
                                <div className="border-b border-main pb-5">
                                    <h3 className="text-[18px] font-bold flex items-center space-x-2">
                                        <Type
                                            size={20}
                                            className="text-accent"
                                        />
                                        <span>Interface Font</span>
                                    </h3>
                                    <p className="text-muted text-[13px] mt-1">
                                        Choose the font used across the entire
                                        FinTrace interface. Changes apply
                                        immediately.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {FONT_OPTIONS.map(
                                        ({ value, description }) => {
                                            const isActive = font === value;
                                            return (
                                                <button
                                                    key={value}
                                                    onClick={() =>
                                                        setFont(value)
                                                    }
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                                        isActive
                                                            ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                                                            : "border-main bg-main hover:bg-secondary hover:border-accent/30",
                                                    )}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div
                                                            className="text-[20px] font-medium mb-0.5 truncate"
                                                            style={{
                                                                fontFamily:
                                                                    FONT_STACKS[
                                                                        value
                                                                    ],
                                                            }}
                                                        >
                                                            {value}
                                                        </div>
                                                        <div
                                                            className="text-[13px] text-muted"
                                                            style={{
                                                                fontFamily:
                                                                    FONT_STACKS[
                                                                        value
                                                                    ],
                                                            }}
                                                        >
                                                            AaBbCcDd 0123456789
                                                            — {description}
                                                        </div>
                                                    </div>
                                                    {isActive && (
                                                        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0 ml-4">
                                                            <Check
                                                                size={13}
                                                                strokeWidth={3}
                                                                className="text-white"
                                                            />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        },
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Appearance (Theme Picker) ── */}
                    {activeSection === "appearance" && (
                        <div className="p-8 bg-secondary rounded-2xl border border-main space-y-6">
                            <div className="border-b border-main pb-5">
                                <h3 className="text-[18px] font-bold flex items-center space-x-2">
                                    <Palette
                                        size={20}
                                        className="text-accent"
                                    />
                                    <span>Color Theme</span>
                                </h3>
                                <p className="text-muted text-[13px] mt-1">
                                    Select your preferred color scheme. Each
                                    dark theme has a distinct palette and mood.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {THEME_OPTIONS.map((t) => {
                                    const isActive = theme === t.value;
                                    return (
                                        <button
                                            key={t.value}
                                            onClick={() => setTheme(t.value)}
                                            className={cn(
                                                "relative rounded-xl overflow-hidden border-2 transition-all",
                                                isActive
                                                    ? "border-accent shadow-lg shadow-accent/20"
                                                    : "border-transparent hover:border-accent/30",
                                            )}
                                        >
                                            {/* Preview swatch */}
                                            <div
                                                className="h-20 p-3 flex flex-col justify-between"
                                                style={{
                                                    backgroundColor: t.bg,
                                                    borderBottom: `1px solid ${t.border}`,
                                                }}
                                            >
                                                <div className="flex items-center space-x-1.5">
                                                    <div
                                                        className="w-8 h-1.5 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                "#007AFF",
                                                        }}
                                                    />
                                                    <div
                                                        className="w-12 h-1.5 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                t.border,
                                                        }}
                                                    />
                                                    <div
                                                        className="w-6 h-1.5 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                t.border,
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex space-x-1">
                                                        <div
                                                            className="flex-1 h-1.5 rounded"
                                                            style={{
                                                                backgroundColor:
                                                                    t.secondaryBg,
                                                            }}
                                                        />
                                                        <div
                                                            className="w-8 h-1.5 rounded"
                                                            style={{
                                                                backgroundColor:
                                                                    "#10b981",
                                                                opacity: 0.7,
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex space-x-1">
                                                        <div
                                                            className="flex-1 h-1.5 rounded"
                                                            style={{
                                                                backgroundColor:
                                                                    t.secondaryBg,
                                                            }}
                                                        />
                                                        <div
                                                            className="w-6 h-1.5 rounded"
                                                            style={{
                                                                backgroundColor:
                                                                    "#f43f5e",
                                                                opacity: 0.7,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                className="px-3 py-2 flex items-center justify-between"
                                                style={{
                                                    backgroundColor:
                                                        t.secondaryBg,
                                                }}
                                            >
                                                <span
                                                    className="text-[12px] font-semibold"
                                                    style={{ color: t.text }}
                                                >
                                                    {t.label}
                                                </span>
                                                {isActive && (
                                                    <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                                                        <Check
                                                            size={9}
                                                            strokeWidth={3}
                                                            className="text-white"
                                                        />
                                                    </div>
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
                        <div className="p-8 bg-secondary rounded-2xl border border-main space-y-6">
                            <h3 className="text-[18px] font-bold">
                                Notifications
                            </h3>
                            <div className="space-y-4">
                                {[
                                    {
                                        label: "Price Alerts",
                                        desc: "Get notified when assets hit your target prices.",
                                    },
                                    {
                                        label: "Portfolio Updates",
                                        desc: "Daily portfolio performance summaries.",
                                    },
                                    {
                                        label: "Market News",
                                        desc: "Breaking news affecting your watchlist.",
                                    },
                                ].map((n, i) => (
                                    <div
                                        key={n.label}
                                        className="flex items-center justify-between p-4 bg-main rounded-xl border border-main"
                                    >
                                        <div>
                                            <div className="text-[14px] font-semibold">
                                                {n.label}
                                            </div>
                                            <p className="text-[12px] text-muted">
                                                {n.desc}
                                            </p>
                                        </div>
                                        <div
                                            className={cn(
                                                "w-12 h-6 rounded-full relative cursor-pointer transition-colors",
                                                i === 0
                                                    ? "bg-accent"
                                                    : "bg-secondary border border-main",
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                                                    i === 0
                                                        ? "right-1"
                                                        : "left-1",
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Integrations & AI ── */}
                    {activeSection === "integrations" && (
                        <div className="space-y-6">
                            {/* ── AI Providers ── */}
                            <div className="p-8 bg-secondary rounded-2xl border border-main space-y-6">
                                <div className="border-b border-main pb-5">
                                    <h3 className="text-[18px] font-bold flex items-center space-x-2">
                                        <KeyRound
                                            size={20}
                                            className="text-accent"
                                        />
                                        <span>AI Providers</span>
                                    </h3>
                                    <p className="text-muted text-[13px] mt-1">
                                        Configure API keys for each AI provider. Toggle providers on/off and add custom ones.
                                        The active provider and model can be switched directly in the chat panel.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {aiProviders.map((provider) => (
                                        <ProviderCard
                                            key={provider.id}
                                            provider={provider}
                                            isBuiltIn={builtInIds.has(provider.id)}
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
                                </div>

                                <AddProviderForm onAdd={addCustomProvider} />
                            </div>

                            {/* ── Other integrations ── */}
                            <div className="p-8 bg-secondary rounded-2xl border border-main space-y-6">
                                <div className="border-b border-main pb-5">
                                    <h3 className="text-[18px] font-bold flex items-center space-x-2">
                                        <Globe
                                            size={20}
                                            className="text-accent"
                                        />
                                        <span>Other Integrations</span>
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[12px] font-bold text-muted uppercase tracking-wider">
                                        CryptoPanic Auth Token
                                    </label>
                                    <ApiKeyInput
                                        value={cryptoPanicApiKey}
                                        placeholder="Your free api auth token..."
                                        onChange={setCryptoPanicApiKey}
                                    />
                                    <p className="text-[11px] text-muted">
                                        Required for real news updates. Get yours at{" "}
                                        <a
                                            href="https://cryptopanic.com/developers/api/"
                                            className="text-accent hover:underline"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            cryptopanic.com
                                        </a>
                                    </p>
                                </div>
                            </div>

                            {/* ── AI Model + Prompt ── */}
                            <div className="p-8 bg-secondary rounded-2xl border border-main space-y-6">
                                <div className="border-b border-main pb-5">
                                    <h3 className="text-[18px] font-bold flex items-center space-x-2">
                                        <Globe size={20} className="text-accent" />
                                        <span>Model & Prompt Defaults</span>
                                    </h3>
                                    <p className="text-muted text-[13px] mt-1">
                                        Default model for OpenRouter. You can also switch model directly in the chat.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[12px] font-bold text-muted uppercase tracking-wider flex items-center justify-between">
                                        <span>Default OpenRouter Model</span>
                                        {isLoadingModels && (
                                            <span className="text-[10px] text-accent animate-pulse capitalize normal-case">
                                                Fetching latest...
                                            </span>
                                        )}
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedModel}
                                            onChange={(e) =>
                                                setSelectedModel(e.target.value)
                                            }
                                            className="w-full bg-main border border-main rounded-lg py-2.5 pl-4 pr-10 text-[14px] focus:outline-none focus:ring-1 focus:ring-accent/30 appearance-none"
                                            disabled={isLoadingModels}
                                        >
                                            {models.length === 0 ? (
                                                <option value={selectedModel}>
                                                    {selectedModel} (loading models...)
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
                                                    (m) => m.id === selectedModel,
                                                ) && (
                                                    <option value={selectedModel}>
                                                        {selectedModel}
                                                    </option>
                                                )}
                                        </select>
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                            <Type size={14} className="text-muted" />
                                        </div>
                                    </div>
                                </div>

                                {/* System Prompt */}
                                <div className="space-y-2">
                                    <label className="text-[12px] font-bold text-muted uppercase tracking-wider flex items-center justify-between">
                                        <span>AI System Prompt</span>
                                        <button
                                            className="text-[10px] text-accent hover:text-accent/80 transition-colors uppercase tracking-wide normal-case"
                                            onClick={() => {
                                                setSystemPrompt(`You are FinTrace AI, an expert crypto market analyst embedded in the FinTrace trading platform.

You have access to real-time market data for the coin the user is currently viewing. This data will be injected at the start of each conversation.

Your role:
- Provide sharp, data-driven analysis of price action, trends, and momentum
- Explain technical indicators (MA, EMA, RSI, MACD, support/resistance)
- Assess risk/reward and market context
- Answer questions clearly, concisely, and in the user's language

You do NOT give financial advice or buy/sell recommendations. Always state that decisions are the user's own.`);
                                            }}
                                        >
                                            Reset to Default
                                        </button>
                                    </label>
                                    <textarea
                                        rows={10}
                                        value={systemPrompt}
                                        onChange={(e) =>
                                            setSystemPrompt(e.target.value)
                                        }
                                        className="w-full bg-main border border-main rounded-lg py-3 px-4 text-[13px] font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent/30 resize-y"
                                    />
                                    <p className="text-[11px] text-muted">
                                        Use the placeholder{" "}
                                        <span className="font-mono bg-main px-1 py-0.5 rounded text-main border border-main">
                                            {"{CONTEXT}"}
                                        </span>{" "}
                                        to show where real-time market data will be injected automatically.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Fallback placeholder ── */}
                    {![
                        "profile",
                        "ui",
                        "appearance",
                        "integrations",
                        "notif",
                    ].includes(activeSection) && (
                        <div className="p-8 bg-secondary rounded-2xl border border-main flex items-center justify-center min-h-[200px]">
                            <p className="text-muted text-[14px]">
                                This section is coming soon.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}
