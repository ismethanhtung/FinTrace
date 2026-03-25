"use client";

import React from "react";
import PageLayout from "../../components/PageLayout";
import { LeftSidebar } from "../../components/LeftSidebar";
import { DataStreamTape } from "../../components/dataStream/DataStreamTape";
import { DataStreamFilters } from "../../components/dataStream/DataStreamFilters";
import { SpeedMeter } from "../../components/dataStream/SpeedMeter";
import { PanicFomoMeter } from "../../components/dataStream/PanicFomoMeter";
import { useDataStream } from "../../hooks/useDataStream";
import { RefreshCw, AlertCircle } from "lucide-react";
import { QuestionTooltip } from "../../components/ui/QuestionTooltip";

function netLabel(buyUsd30s: number, sellUsd30s: number): string {
    const net = buyUsd30s - sellUsd30s;
    const pct =
        buyUsd30s + sellUsd30s > 0 ? (net / (buyUsd30s + sellUsd30s)) * 100 : 0;
    const sign = net >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
}

export default function DataStreamPage() {
    const {
        config,
        setConfig,
        records,
        metrics,
        connectionStatus,
        error,
        reset,
        soundEnabled,
        soundArmed,
        toggleSoundEnabled,
        selectedSymbol,
        marketType,
    } = useDataStream();

    return (
        <PageLayout title="Data Streams" wide>
            <div className="flex flex-col gap-4">
                <div className="flex min-h-0 h-[calc(100dvh-9.5rem)] w-full rounded-xl border border-main overflow-hidden bg-main">
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
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => reset()}
                                        className="px-3 py-2 rounded-md border border-main bg-main text-muted hover:text-main hover:bg-secondary transition-colors text-[12px] font-semibold flex items-center gap-2"
                                    >
                                        <RefreshCw size={14} />
                                        Reset
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
                                            <QuestionTooltip
                                                text="Chênh lệch tổng giá trị BUY - SELL trong ~30 giây gần nhất. Net dương => phe mua mạnh hơn; net âm => phe bán mạnh hơn."
                                            />
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
            </div>
        </PageLayout>
    );
}
