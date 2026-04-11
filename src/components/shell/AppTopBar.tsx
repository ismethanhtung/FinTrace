"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Palette, RefreshCw, Sun } from "lucide-react";
import { QuickSearchDropdown } from "../AssetList";
import { UserMenu } from "../UserMenu";
import { WorldSwitch } from "./WorldSwitch";
import { LocaleSwitch } from "./LocaleSwitch";
import { TopbarFeedback } from "./TopbarFeedback";
import {
    useAppSettings,
    type AppTheme,
} from "../../context/AppSettingsContext";
import { useI18n } from "../../context/I18nContext";
import { useUniverse } from "../../context/UniverseContext";
import { type TranslationKey } from "../../i18n/translate";
import { cn } from "../../lib/utils";

type NavItem = {
    href: string;
    label?: string;
    labelKey?: TranslationKey;
};

const DEFAULT_NAV_ITEMS: NavItem[] = [
    { href: "/", labelKey: "navigation.chart" },
    { href: "/market", labelKey: "navigation.market" },
    { href: "/board", labelKey: "navigation.board" },
    { href: "/data-stream", labelKey: "navigation.dataStreams" },
    { href: "/transactions", labelKey: "navigation.transactions" },
    { href: "/news", labelKey: "navigation.news" },
];

const THEME_META: Record<
    AppTheme,
    { icon: React.ReactNode; labelKey: TranslationKey }
> = {
    light: { icon: <Sun size={14} />, labelKey: "theme.light" },
    dark1: { icon: <Moon size={14} />, labelKey: "theme.dark1" },
    dark2: { icon: <Moon size={14} />, labelKey: "theme.dark2" },
    dark3: { icon: <Palette size={14} />, labelKey: "theme.dark3" },
    dark4: { icon: <Palette size={14} />, labelKey: "theme.dark4" },
    dark5: { icon: <Moon size={14} />, labelKey: "theme.dark5" },
};

export function AppTopBar({
    onRefresh,
    isRefreshing = false,
    refreshTitle = "Refresh",
    refreshAriaLabel = "Refresh",
    navItems = DEFAULT_NAV_ITEMS,
    rightExtra,
    headerClassName,
}: {
    onRefresh?: () => void;
    isRefreshing?: boolean;
    refreshTitle?: string;
    refreshAriaLabel?: string;
    navItems?: NavItem[];
    rightExtra?: React.ReactNode;
    headerClassName?: string;
}) {
    const pathname = usePathname();
    const { t } = useI18n();
    const { universe } = useUniverse();
    const { theme, toggleTheme } = useAppSettings();
    const meta = THEME_META[theme];
    const themeLabel = t(meta.labelKey);
    const sharedNavItem =
        universe === "stock"
            ? ({ href: "/board", labelKey: "navigation.board" } as const)
            : ({ href: "/market", labelKey: "navigation.market" } as const);
    const resolvedNavItems: NavItem[] = [];
    let sharedInserted = false;
    for (const item of navItems) {
        if (item.href === "/market" || item.href === "/board") {
            if (sharedInserted) continue;
            resolvedNavItems.push(sharedNavItem);
            sharedInserted = true;
            continue;
        }
        resolvedNavItems.push(item);
    }

    return (
        <header
            className={cn(
                "h-12 border-b border-main flex items-center justify-between px-4 bg-main z-50 shrink-0",
                headerClassName,
            )}
        >
            <div className="flex items-center space-x-6">
                <Link href="/" className="flex items-center space-x-2">
                    <Image
                        src="/logo.gif"
                        alt={t("topbar.logoAlt")}
                        width={36}
                        height={36}
                        className="rounded-sm"
                        unoptimized
                        priority
                    />
                    <span className="font-bold text-[14px] tracking-tight">
                        FinTrace
                    </span>
                </Link>

                <nav className="flex items-center space-x-2">
                    {resolvedNavItems.map((item) => {
                        const isSharedSlot =
                            item.href === "/market" || item.href === "/board";
                        const active = isSharedSlot
                            ? pathname === "/market" || pathname === "/board"
                            : pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center space-x-1.5 px-2.5 py-1.5 transition-colors rounded-md text-[12px]",
                                    active
                                        ? "text-main font-bold"
                                        : "text-muted hover:text-main hover:bg-secondary/50 font-medium",
                                )}
                            >
                                <span>
                                    {item.label ??
                                        t(item.labelKey ?? "navigation.chart")}
                                </span>
                            </Link>
                        );
                    })}
                    <div className="h-4 w-px border-l border-main" />
                    <WorldSwitch />
                    <QuickSearchDropdown />
                </nav>
            </div>

            <div className="flex items-center gap-2.5">
                <TopbarFeedback />
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main"
                    title={t("common.currentTheme", { theme: themeLabel })}
                >
                    {meta.icon}
                    <span className="text-[11px] font-medium hidden sm:inline">
                        {themeLabel}
                    </span>
                </button>
                <LocaleSwitch />

                {rightExtra}
                <UserMenu />
            </div>
        </header>
    );
}
