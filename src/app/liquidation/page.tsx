"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    AlertTriangle,
    BookOpenText,
    Moon,
    Palette,
    RefreshCw,
    Sun,
} from "lucide-react";
import { LeftSidebar } from "../../components/LeftSidebar";
import { FuturesLiquidationPanel } from "../../components/FuturesLiquidationPanel";
import { UserMenu } from "../../components/UserMenu";
import { QuickSearchDropdown } from "../../components/AssetList";
import { useAppSettings, AppTheme } from "../../context/AppSettingsContext";
import { WorldSwitch } from "../../components/shell/WorldSwitch";

const THEME_META: Record<AppTheme, { icon: React.ReactNode; label: string }> = {
    light: { icon: <Sun size={14} />, label: "Light" },
    dark1: { icon: <Moon size={14} />, label: "Dark I" },
    dark2: { icon: <Moon size={14} />, label: "Dark II" },
    dark3: { icon: <Palette size={14} />, label: "Dark III" },
    dark4: { icon: <Palette size={14} />, label: "Dark IV" },
    dark5: { icon: <Moon size={14} />, label: "Dark V" },
};

export default function LiquidationPage() {
    const { theme, toggleTheme } = useAppSettings();
    const meta = useMemo(() => THEME_META[theme], [theme]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [panelKey, setPanelKey] = useState(0);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setPanelKey((prev) => prev + 1);
        setTimeout(() => setIsRefreshing(false), 800);
    };

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            <header className="h-12 border-b border-main flex items-center justify-between px-4 bg-main z-50 shrink-0">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
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
                    </div>

                    <nav className="flex items-center space-x-2">
                        <Link
                            href="/market"
                            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main text-[12px] font-medium"
                        >
                            <span>Markets</span>
                        </Link>
                        <Link
                            href="/heatmap"
                            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main text-[12px] font-medium"
                        >
                            <span>Heatmap</span>
                        </Link>
                        <Link
                            href="/data-stream"
                            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main text-[12px] font-medium"
                        >
                            <span>Data Streams</span>
                        </Link>
                        <Link
                            href="/news"
                            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main text-[12px] font-medium"
                        >
                            <span>News</span>
                        </Link>
                        <div className="h-4 w-px bg-main border-l border-main" />
                        <WorldSwitch />
                        <QuickSearchDropdown />
                    </nav>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
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
                            onClick={handleRefresh}
                            className={`p-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary ${
                                isRefreshing ? "animate-spin" : ""
                            }`}
                            title="Reload liquidation stream"
                            aria-label="Reload liquidation stream"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    <button className="px-4 py-1.5 bg-accent text-white rounded-md text-[11px] font-semibold hover:bg-accent/90 transition-colors shadow-sm">
                        Trade
                    </button>

                    <div className="h-5 w-px border-l border-main" />
                    <UserMenu />
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col overflow-hidden p-6 sm:p-8 mx-auto w-full max-w-[1600px]">
                <div className="flex min-h-0 flex-1 w-full rounded-xl border border-main overflow-hidden bg-main">
                    <LeftSidebar embedded />

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-main">
                        <div className="px-4 py-3 border-b border-main bg-secondary/10 shrink-0">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-amber-500 font-bold">
                                <AlertTriangle size={14} />
                                Dedicated Liquidation Stream
                            </div>
                            <div className="mt-1 text-[12px] text-muted">
                                Theo doi liquidation futures trong mot trang
                                rieng, nhung van giu nguyen tab Liquidation o
                                trang chu.
                            </div>
                        </div>

                        <div className="flex-1 min-h-0">
                            <FuturesLiquidationPanel key={panelKey} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
