"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
    User,
    Bell,
    Shield,
    Database,
    Globe,
    Type,
    Palette,
    Sparkles,
    Server,
    LifeBuoy,
    ArrowLeft,
    ChevronRight,
    ChevronDown,
    Search,
    LayoutGrid,
    Layers,
    Network,
    Cable,
    Radio,
    Box,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useI18n } from "../context/I18nContext";
import { type TranslationKey } from "../i18n/translate";

// ─── Nav structure ────────────────────────────────────────────────────────────
export type SettingsNavItem = {
    id: string;
    icon: React.ElementType;
    labelKey: TranslationKey;
    /** Nhãn phụ (ví dụ “Sắp có”) */
    badgeKey?: TranslationKey;
};

export type SettingsNavGroup = {
    sectionId: string;
    sectionIcon: React.ElementType;
    groupKey: TranslationKey;
    items: SettingsNavItem[];
};

export const SETTINGS_NAV: SettingsNavGroup[] = [
    {
        sectionId: "general",
        sectionIcon: LayoutGrid,
        groupKey: "settingsLayout.generalSettings",
        items: [
            { id: "profile", icon: User, labelKey: "settingsLayout.account" },
            { id: "ai", icon: Sparkles, labelKey: "settingsLayout.aiSettings" },
            { id: "ui", icon: Type, labelKey: "settingsLayout.typography" },
            {
                id: "appearance",
                icon: Palette,
                labelKey: "settingsLayout.appearance",
            },
            {
                id: "notif",
                icon: Bell,
                labelKey: "settingsLayout.notifications",
            },
        ],
    },
    {
        sectionId: "workspace",
        sectionIcon: Layers,
        groupKey: "settingsLayout.workspaceSettings",
        items: [
            {
                id: "integrations",
                icon: Server,
                labelKey: "settingsLayout.integrations",
            },
            {
                id: "security",
                icon: Shield,
                labelKey: "settingsLayout.security",
            },
            {
                id: "data",
                icon: Database,
                labelKey: "settingsLayout.dataPrivacy",
            },
            {
                id: "support",
                icon: LifeBuoy,
                labelKey: "settingsLayout.supportAccess",
            },
        ],
    },
    {
        sectionId: "connection",
        sectionIcon: Network,
        groupKey: "settingsLayout.connection",
        items: [
            {
                id: "connectionTest",
                icon: Cable,
                labelKey: "settingsLayout.connectionTest",
            },
            {
                id: "connectionStreams",
                icon: Radio,
                labelKey: "settingsLayout.connectionStreams",
                badgeKey: "settingsLayout.badgeSoon",
            },
            {
                id: "connectionProviders",
                icon: Box,
                labelKey: "settingsLayout.connectionProviders",
                badgeKey: "settingsLayout.badgeSoon",
            },
        ],
    },
];

/** Mọi `id` mục trong sidebar Cài đặt (dùng cho `?section=`). */
export const SETTINGS_SECTION_IDS: string[] = SETTINGS_NAV.flatMap((g) =>
    g.items.map((i) => i.id),
);

function SettingsSectionHeader({
    label,
    icon: Icon,
    isOpen,
    onToggle,
}: {
    label: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors group rounded-md hover:bg-secondary/80"
        >
            <div className="flex min-w-0 items-center gap-2.5">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-main" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted group-hover:text-main">
                    {label}
                </span>
            </div>
            {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-main" />
            ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-main" />
            )}
        </button>
    );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function SettingsSidebar({
    activeSection,
    onSelect,
}: {
    activeSection: string;
    onSelect: (id: string) => void;
}) {
    const { t } = useI18n();
    const { data: session } = useSession();
    const [navQuery, setNavQuery] = useState("");
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        general: true,
        workspace: true,
        connection: true,
    });

    const toggleSection = (id: string) => {
        setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const filteredGroups = useMemo(() => {
        const q = navQuery.trim().toLowerCase();
        if (!q) return SETTINGS_NAV;
        return SETTINGS_NAV.map((group) => ({
            ...group,
            items: group.items.filter((item) =>
                t(item.labelKey).toLowerCase().includes(q),
            ),
        })).filter((g) => g.items.length > 0);
    }, [navQuery, t]);

    return (
        <aside className="flex h-full min-h-0 w-[264px] shrink-0 flex-col overflow-hidden border-r border-main bg-secondary/40 select-none">
            {/* Logo row */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-main px-4">
                <Link
                    href="/"
                    className="flex min-w-0 max-w-[min(100%,180px)] items-center gap-2.5 rounded-md py-0.5 pl-0.5 pr-1.5 transition-colors hover:bg-secondary/90"
                    title={t("common.backToApp")}
                >
                    <Image
                        src="/logo.gif"
                        alt={t("topbar.logoAlt")}
                        width={32}
                        height={32}
                        unoptimized
                        className="rounded-sm shrink-0"
                        priority
                    />
                    <span className="truncate text-[14px] font-bold tracking-tight text-main">
                        FinTrace
                    </span>
                </Link>
                <Link
                    href="/"
                    className="shrink-0 rounded-lg border border-transparent p-1.5 text-muted transition-colors hover:border-main hover:bg-main hover:text-main"
                    title={t("common.backToApp")}
                >
                    <ArrowLeft size={14} />
                </Link>
            </div>

            {/* User row — compact header */}
            <div className="shrink-0 border-b border-main px-3 py-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-main bg-main">
                        {session?.user?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={session.user.image}
                                alt={session.user.name || "User"}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <User size={15} className="text-accent" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-main">
                            {session?.user?.name || t("auth.signIn")}
                        </p>
                        <p className="truncate text-[10px] text-muted">
                            {session?.user?.email || "—"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick search */}
            <div className="shrink-0 px-3 py-2.5">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                    <input
                        type="search"
                        value={navQuery}
                        onChange={(e) => setNavQuery(e.target.value)}
                        placeholder={t("settingsLayout.navSearchPlaceholder")}
                        className="w-full rounded-md border border-main bg-main py-1.5 pl-8 pr-3 text-[12px] text-main placeholder:text-muted/60 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/25"
                    />
                </div>
            </div>

            {/* Nav — collapsible sections */}
            <nav className="thin-scrollbar flex-1 min-h-0 overflow-y-auto px-2 pb-6 pt-1">
                {filteredGroups.map((group) => {
                    const isOpen = openSections[group.sectionId] ?? true;
                    return (
                        <div key={group.sectionId} className="mt-1 first:mt-0">
                            <SettingsSectionHeader
                                label={t(group.groupKey)}
                                icon={group.sectionIcon}
                                isOpen={isOpen}
                                onToggle={() => toggleSection(group.sectionId)}
                            />
                            <AnimatePresence initial={false}>
                                {isOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{
                                            duration: 0.2,
                                            ease: "easeInOut",
                                        }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-0.5 py-1">
                                            {group.items.map((item) => {
                                                const active =
                                                    activeSection === item.id;
                                                const Icon = item.icon;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() =>
                                                            onSelect(item.id)
                                                        }
                                                        className={cn(
                                                            "group flex w-full items-center gap-2.5 border-l-2 py-1.5 pl-2.5 pr-2 text-left transition-all duration-150",
                                                            active
                                                                ? "border-l-accent bg-accent/10"
                                                                : "border-l-transparent hover:bg-secondary/90",
                                                        )}
                                                    >
                                                        <Icon
                                                            className={cn(
                                                                "h-3.5 w-3.5 shrink-0",
                                                                active
                                                                    ? "text-accent"
                                                                    : "text-muted group-hover:text-main",
                                                            )}
                                                            strokeWidth={
                                                                active
                                                                    ? 2.2
                                                                    : 1.8
                                                            }
                                                        />
                                                        <span
                                                            className={cn(
                                                                "min-w-0 flex-1 truncate text-[12px]",
                                                                active
                                                                    ? "font-semibold text-main"
                                                                    : "text-muted group-hover:text-main",
                                                            )}
                                                        >
                                                            {t(item.labelKey)}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="shrink-0 border-t border-main bg-secondary/30 px-3 py-3">
                <p className="text-center text-[10px] text-muted">
                    {t("settingsLayout.footer")}
                </p>
            </div>
        </aside>
    );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function SettingsLayout({
    children,
    activeSection,
    onSelect,
    pageTitle,
    pageDescription,
}: {
    children: React.ReactNode;
    activeSection: string;
    onSelect: (id: string) => void;
    pageTitle?: string;
    pageDescription?: string;
}) {
    const { data: session } = useSession();
    return (
        <div className="flex h-screen overflow-hidden bg-main text-main">
            <SettingsSidebar
                activeSection={activeSection}
                onSelect={onSelect}
            />

            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
                {/* Top bar */}
                <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-main bg-main/80 px-8 backdrop-blur-sm">
                    <div>
                        {pageTitle && (
                            <h1 className="text-[17px] font-semibold leading-none tracking-tight">
                                {pageTitle}
                            </h1>
                        )}
                        {pageDescription && (
                            <p className="mt-0.5 text-[12px] leading-none text-muted">
                                {pageDescription}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Globe
                            size={14}
                            className="text-muted"
                            strokeWidth={1.5}
                        />
                    </div>
                </header>

                {/* Content */}
                <main className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-4xl px-8 py-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
