"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Palette, RefreshCw, Sun } from "lucide-react";
import { QuickSearchDropdown } from "../AssetList";
import { UserMenu } from "../UserMenu";
import { WorldSwitch } from "./WorldSwitch";
import { useAppSettings, type AppTheme } from "../../context/AppSettingsContext";
import { cn } from "../../lib/utils";

type NavItem = {
    href: string;
    label: string;
};

const DEFAULT_NAV_ITEMS: NavItem[] = [
    { href: "/", label: "Chart" },
    { href: "/market", label: "Markets" },
    { href: "/board", label: "Board" },
    { href: "/heatmap", label: "Heatmap" },
    { href: "/data-stream", label: "Data Streams" },
    { href: "/transactions", label: "Transactions" },
    { href: "/news", label: "News" },
];

const THEME_META: Record<AppTheme, { icon: React.ReactNode; label: string }> = {
    light: { icon: <Sun size={14} />, label: "Light" },
    dark1: { icon: <Moon size={14} />, label: "Dark I" },
    dark2: { icon: <Moon size={14} />, label: "Dark II" },
    dark3: { icon: <Palette size={14} />, label: "Dark III" },
    dark4: { icon: <Palette size={14} />, label: "Dark IV" },
    dark5: { icon: <Moon size={14} />, label: "Dark V" },
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
    const { theme, toggleTheme } = useAppSettings();
    const meta = THEME_META[theme];

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
                        alt="FinTrace logo"
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
                    {navItems.map((item) => {
                        const active = pathname === item.href;
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
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                    <div className="h-4 w-px border-l border-main" />
                    <WorldSwitch />
                    <QuickSearchDropdown />
                </nav>
            </div>

            <div className="flex items-center space-x-3">
                <button
                    onClick={toggleTheme}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main"
                    title={`Current: ${meta.label} - click to cycle theme`}
                >
                    {meta.icon}
                    <span className="text-[11px] font-medium hidden sm:inline">
                        {meta.label}
                    </span>
                </button>

                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className={cn(
                            "p-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary",
                            isRefreshing && "animate-spin",
                        )}
                        title={refreshTitle}
                        aria-label={refreshAriaLabel}
                    >
                        <RefreshCw size={14} />
                    </button>
                )}

                {rightExtra}

                <div className="h-5 w-px border-l border-main" />
                <UserMenu />
            </div>
        </header>
    );
}
