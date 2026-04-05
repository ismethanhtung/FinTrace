"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "../lib/utils";
import { useI18n } from "../context/I18nContext";
import { type TranslationKey } from "../i18n/translate";

// ─── Nav structure ────────────────────────────────────────────────────────────
export type SettingsNavItem = {
    id: string;
    icon: React.ElementType;
    labelKey: TranslationKey;
};

export type SettingsNavGroup = {
    groupKey: TranslationKey;
    items: SettingsNavItem[];
};

export const SETTINGS_NAV: SettingsNavGroup[] = [
    {
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
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function SettingsSidebar({
    activeSection,
    onSelect,
}: {
    activeSection: string;
    onSelect: (id: string) => void;
}) {
    const { t } = useI18n();

    return (
        <aside className="w-[260px] shrink-0 border-r border-main bg-secondary/60 flex flex-col min-h-screen">
            {/* Logo row */}
            <div className="h-14 flex items-center justify-between px-5 border-b border-main">
                <div className="flex items-center gap-2.5">
                    <Image
                        src="/logo.gif"
                        alt={t("topbar.logoAlt")}
                        width={36}
                        height={36}
                        unoptimized
                        className="rounded-sm"
                        priority
                    />
                    <span className="font-bold text-[15px] tracking-tight">
                        FinTrace
                    </span>
                </div>
                <Link
                    href="/"
                    className="p-1.5 rounded-lg hover:bg-main border border-transparent hover:border-main transition-colors text-muted hover:text-main"
                    title={t("common.backToApp")}
                >
                    <ArrowLeft size={14} />
                </Link>
            </div>

            {/* User card */}
            <div className="px-4 py-4 border-b border-main">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-main border border-main">
                    <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                        <User size={16} className="text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold truncate">
                            Nguyen Thanh Tung
                        </p>
                        <p className="text-[11px] text-muted truncate">
                            ismethanhtung@gmail.com
                        </p>
                    </div>
                    <ChevronRight size={13} className="text-muted shrink-0" />
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto thin-scrollbar px-3 py-3 space-y-5">
                {SETTINGS_NAV.map((group) => (
                    <div key={group.groupKey} className="space-y-0.5">
                        <p className="px-3 pb-1.5 text-[10px] uppercase tracking-[0.14em] text-muted font-semibold">
                            {t(group.groupKey)}
                        </p>
                        {group.items.map((item) => {
                            const isActive = activeSection === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onSelect(item.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all",
                                        isActive
                                            ? "bg-accent/10 text-accent"
                                            : "text-muted hover:bg-main hover:text-main",
                                    )}
                                >
                                    <item.icon
                                        size={15}
                                        strokeWidth={isActive ? 2.2 : 1.8}
                                    />
                                    <span>{t(item.labelKey)}</span>
                                    {isActive && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-main">
                <p className="text-[10px] text-muted text-center">
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
    return (
        <div className="min-h-screen flex bg-main text-main">
            <SettingsSidebar
                activeSection={activeSection}
                onSelect={onSelect}
            />

            <div className="flex-1 flex flex-col min-h-screen min-w-0">
                {/* Top bar */}
                <header className="h-14 border-b border-main flex items-center justify-between px-8 bg-main/80 backdrop-blur-sm sticky top-0 z-10">
                    <div>
                        {pageTitle && (
                            <h1 className="text-[17px] font-semibold tracking-tight leading-none">
                                {pageTitle}
                            </h1>
                        )}
                        {pageDescription && (
                            <p className="text-[12px] text-muted mt-0.5 leading-none">
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
                        <span className="text-[12px] text-muted">
                            fintrace.io
                        </span>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto thin-scrollbar">
                    <div className="max-w-4xl mx-auto px-8 py-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
