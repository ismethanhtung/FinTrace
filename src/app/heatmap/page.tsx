"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Moon, RefreshCw, Sun, Palette } from "lucide-react";
import { MarketHeatmap } from "../../components/MarketHeatmap";
import { TickerBar } from "../../components/TickerBar";
import { UserMenu } from "../../components/UserMenu";
import { QuickSearchDropdown } from "../../components/AssetList";
import { useAppSettings, AppTheme } from "../../context/AppSettingsContext";
import { cn } from "../../lib/utils";

const THEME_META: Record<AppTheme, { icon: React.ReactNode; label: string }> = {
    light: { icon: <Sun size={14} />, label: "Light" },
    dark1: { icon: <Moon size={14} />, label: "Dark I" },
    dark2: { icon: <Moon size={14} />, label: "Dark II" },
    dark3: { icon: <Palette size={14} />, label: "Dark III" },
    dark4: { icon: <Palette size={14} />, label: "Dark IV" },
    dark5: { icon: <Moon size={14} />, label: "Dark V" },
};

export default function HeatmapPage() {
    const { theme, toggleTheme } = useAppSettings();
    const meta = THEME_META[theme];

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            <header className="h-12 border-b border-main flex items-center justify-between px-4 bg-main z-50 shrink-0">
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
                        <Link
                            href="/"
                            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main text-[12px] font-medium"
                        >
                            <span>Chart</span>
                        </Link>
                        <Link
                            href="/market"
                            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main text-[12px] font-medium"
                        >
                            <span>Markets</span>
                        </Link>
                        <Link
                            href="/news"
                            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main text-[12px] font-medium"
                        >
                            <span>News</span>
                        </Link>
                        <Link
                            href="/data-stream"
                            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main text-[12px] font-medium"
                        >
                            <span>Data Streams</span>
                        </Link>

                        <div className="h-4 w-px bg-main border-l border-main" />
                        <QuickSearchDropdown />
                    </nav>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main"
                        title={`Current: ${meta.label} — click to cycle theme`}
                    >
                        {meta.icon}
                        <span className="text-[11px] font-medium hidden sm:inline">
                            {meta.label}
                        </span>
                    </button>

                    <button
                        className="p-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary"
                        title="Heatmap auto refreshes from TradingView"
                        aria-label="Heatmap auto refreshes from TradingView"
                    >
                        <RefreshCw size={14} />
                    </button>

                    <div className="h-5 w-px border-l border-main" />
                    <UserMenu />
                </div>
            </header>

            <main className="flex-1 min-h-0">
                <MarketHeatmap className="h-full w-full" />
            </main>

            <TickerBar />
        </div>
    );
}
