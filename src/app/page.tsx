"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MainChart } from "../components/MainChart";
import { RightPanel } from "../components/RightPanel";
import { UserMenu } from "../components/UserMenu";
import { LeftSidebar } from "../components/LeftSidebar";
import { OrderBook } from "../components/OrderBook";
import { TickerBar } from "../components/TickerBar";
import { QuickSearchDropdown } from "../components/AssetList";
import { useMarket } from "../context/MarketContext";
import {
    useAppSettings,
    THEME_CYCLE,
    AppTheme,
} from "../context/AppSettingsContext";
import { Moon, Sun, RefreshCw, Palette } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const BOTTOM_MIN = 100;
const BOTTOM_MAX = 460;
const BOTTOM_DEFAULT = 240;

// ─── Per-theme icon & label ─────────────────────────────────────────────────
const THEME_META: Record<AppTheme, { icon: React.ReactNode; label: string }> = {
    light: { icon: <Sun size={14} />, label: "Light" },
    dark1: { icon: <Moon size={14} />, label: "Dark I" },
    dark2: { icon: <Moon size={14} />, label: "Dark II" },
    dark3: { icon: <Palette size={14} />, label: "Dark III" },
    dark4: { icon: <Palette size={14} />, label: "Dark IV" },
    dark5: { icon: <Moon size={14} />, label: "Dark V" },
};

export default function App() {
    const { theme, toggleTheme } = useAppSettings();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [bottomHeight, setBottomHeight] = useState(BOTTOM_DEFAULT);
    const { assets, selectedSymbol } = useMarket();

    const currentAsset = assets.find((a) => a.id === selectedSymbol);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // ── Vertical resize for bottom pane ──────────────────────────────────────
    const isDraggingBottom = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(BOTTOM_DEFAULT);

    const onBottomHandleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            isDraggingBottom.current = true;
            startY.current = e.clientY;
            startHeight.current = bottomHeight;
            document.body.style.cursor = "row-resize";
            document.body.style.userSelect = "none";
            e.preventDefault();
        },
        [bottomHeight],
    );

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDraggingBottom.current) return;
            // Dragging up = bigger bottom pane (negative delta from start)
            const delta = startY.current - e.clientY;
            setBottomHeight(
                Math.min(
                    BOTTOM_MAX,
                    Math.max(BOTTOM_MIN, startHeight.current + delta),
                ),
            );
        };
        const onUp = () => {
            if (!isDraggingBottom.current) return;
            isDraggingBottom.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
    }, []);

    const meta = THEME_META[theme];

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            {/* ── Global Header ── */}
            <header className="h-12 border-b border-main flex items-center justify-between px-4 bg-main z-50 shrink-0">
                <div className="flex items-center space-x-6">
                    {/* Logo */}
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

                    {/* Nav: watchlist dropdown + quick search */}
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
                        <QuickSearchDropdown />
                    </nav>
                </div>

                {/* Right controls */}
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                        {/* Theme toggle */}
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
                            className={`p-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary ${isRefreshing ? "animate-spin" : ""}`}
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

            {/* ── Main Layout ── */}
            <div className="flex-1 flex min-h-0">
                {/* Left Sidebar */}
                <LeftSidebar />

                {/* Center: Chart + Order Book */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Price Chart — takes remaining height */}
                    <div className="flex-1 min-h-0">
                        <MainChart />
                    </div>

                    {/* ── Vertical resize handle ── */}
                    <div
                        onMouseDown={onBottomHandleMouseDown}
                        className="h-1.5 shrink-0 cursor-row-resize bg-transparent hover:bg-accent/25 active:bg-accent/40 transition-colors group relative"
                        title="Drag to resize order book"
                    >
                        {/* Visual grip indicator */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                            <div className="w-12 h-0.5 rounded-full bg-main border border-main group-hover:bg-accent/50 transition-colors" />
                        </div>
                    </div>

                    {/* Order Book — resizable height */}
                    <div className="shrink-0" style={{ height: bottomHeight }}>
                        <OrderBook />
                    </div>
                </div>

                {/* Right Panel: AI Analysis (horizontally resizable) */}
                <RightPanel />
            </div>

            {/* ── Bottom Ticker Bar ── */}
            <TickerBar />
        </div>
    );
}
