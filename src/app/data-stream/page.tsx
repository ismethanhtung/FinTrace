"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LeftSidebar } from "../../components/LeftSidebar";
import { DataStreamTape } from "../../components/dataStream/DataStreamTape";
import { DataStreamFilters } from "../../components/dataStream/DataStreamFilters";
import { SpeedMeter } from "../../components/dataStream/SpeedMeter";
import { PanicFomoMeter } from "../../components/dataStream/PanicFomoMeter";
import { TickerBar } from "../../components/TickerBar";
import { UserMenu } from "../../components/UserMenu";
import { QuickSearchDropdown } from "../../components/AssetList";
import { useDataStream } from "../../hooks/useDataStream";
import {
    RefreshCw,
    AlertCircle,
    Trash2,
    Moon,
    Sun,
    Palette,
} from "lucide-react";
import { QuestionTooltip } from "../../components/ui/QuestionTooltip";
import { useAppSettings, AppTheme } from "../../context/AppSettingsContext";
import { WorldSwitch } from "../../components/shell/WorldSwitch";
import { useUniverse } from "../../context/UniverseContext";

function netLabel(buyUsd30s: number, sellUsd30s: number): string {
    const net = buyUsd30s - sellUsd30s;
    const pct =
        buyUsd30s + sellUsd30s > 0 ? (net / (buyUsd30s + sellUsd30s)) * 100 : 0;
    const sign = net >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
}

const THEME_META: Record<AppTheme, { icon: React.ReactNode; label: string }> = {
    light: { icon: <Sun size={14} />, label: "Light" },
    dark1: { icon: <Moon size={14} />, label: "Dark I" },
    dark2: { icon: <Moon size={14} />, label: "Dark II" },
    dark3: { icon: <Palette size={14} />, label: "Dark III" },
    dark4: { icon: <Palette size={14} />, label: "Dark IV" },
    dark5: { icon: <Moon size={14} />, label: "Dark V" },
};

export default function DataStreamPage() {
    const { isMockUniverse } = useUniverse();
    const {
        config,
        setConfig,
        records,
        metrics,
        connectionStatus,
        error,
        reset,
        reconnect,
        soundEnabled,
        soundArmed,
        toggleSoundEnabled,
        selectedSymbol,
        marketType,
    } = useDataStream();

    const { theme, toggleTheme } = useAppSettings();
    const meta = useMemo(() => THEME_META[theme], [theme]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        reconnect();
        setTimeout(() => setIsRefreshing(false), 800);
    };

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            {/* Global topbar */}
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
                            title="Reconnect websocket"
                            aria-label="Reconnect websocket"
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
                        <div className="px-3 py-2 border-b border-main bg-secondary/10 shrink-0">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`inline-block h-1.5 w-1.5 rounded-full ${
                                                connectionStatus === "connected"
                                                    ? "bg-emerald-500 animate-pulse"
                                                    : connectionStatus ===
                                                        "error"
                                                      ? "bg-rose-500"
                                                      : "bg-amber-400 animate-pulse"
                                            }`}
                                        />
                                        <div className="text-[10px] text-muted uppercase tracking-widest font-bold">
                                            {connectionStatus === "connected"
                                                ? "Streaming live"
                                                : connectionStatus ===
                                                    "connecting"
                                                  ? "Connecting..."
                                                  : connectionStatus === "error"
                                                    ? "WS Error"
                                                    : "Disconnected"}
                                        </div>
                                    </div>
                                    <div className="text-[12px] text-muted font-mono">
                                        {marketType.toUpperCase()} ·{" "}
                                        {selectedSymbol}
                                    </div>
                                    {isMockUniverse && (
                                        <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                                            Mock stock stream
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => reset()}
                                        className="px-3 py-2 rounded-md border border-main bg-main text-muted hover:text-main hover:bg-secondary transition-colors text-[12px] font-semibold flex items-center gap-2"
                                    >
                                        <Trash2 size={14} />
                                        Clear
                                    </button>
                                    <button
                                        type="button"
                                        onClick={reconnect}
                                        className="px-3 py-2 rounded-md border border-main bg-main text-muted hover:text-main hover:bg-secondary transition-colors text-[12px] font-semibold flex items-center gap-2"
                                        title="Reconnect websocket"
                                    >
                                        <RefreshCw size={14} />
                                        Reconnect
                                    </button>
                                </div>
                            </div>

                            {error ? (
                                <div className="mt-2 text-[12px] text-rose-500 border border-rose-500/20 bg-rose-500/10 rounded-md px-3 py-2 flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
                            <DataStreamFilters
                                config={config}
                                onChange={setConfig}
                                soundEnabled={soundEnabled}
                                soundArmed={soundArmed}
                                onToggleSoundEnabled={toggleSoundEnabled}
                            />

                            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
                                <div className="flex min-h-0 flex-col space-y-3 overflow-y-auto thin-scrollbar lg:overflow-y-visible">
                                    <SpeedMeter
                                        eventRate10s={metrics.eventRate10s}
                                    />
                                    <PanicFomoMeter
                                        panicScore={metrics.panicScore}
                                        fomoScore={metrics.fomoScore}
                                    />

                                    <div className="rounded-lg border border-main bg-main/50 p-3">
                                        <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest font-bold">
                                            30s Imbalance
                                            <QuestionTooltip text="Chênh lệch tổng giá trị BUY - SELL trong ~30 giây gần nhất. Net dương => phe mua mạnh hơn; net âm => phe bán mạnh hơn." />
                                        </div>
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                            <div className="text-[12px] font-mono text-main">
                                                Net:{" "}
                                                {netLabel(
                                                    metrics.buyUsd30s,
                                                    metrics.sellUsd30s,
                                                )}
                                            </div>
                                            <div className="text-[10px] text-muted font-mono tabular-nums">
                                                BUY $
                                                {metrics.buyUsd30s.toFixed(0)} /
                                                SELL $
                                                {metrics.sellUsd30s.toFixed(0)}
                                            </div>
                                        </div>
                                        <div className="mt-2 text-[9px] text-muted">
                                            2m Highlights:{" "}
                                            <span className="text-accent font-bold">
                                                {metrics.highlightCount2m}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                                    <DataStreamTape records={records} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <TickerBar />
        </div>
    );
}
