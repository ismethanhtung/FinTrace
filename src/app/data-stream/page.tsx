"use client";

import React, { useState } from "react";
import { LeftSidebar } from "../../components/LeftSidebar";
import { DataStreamTape } from "../../components/dataStream/DataStreamTape";
import { DataStreamFilters } from "../../components/dataStream/DataStreamFilters";
import { SpeedMeter } from "../../components/dataStream/SpeedMeter";
import { PanicFomoMeter } from "../../components/dataStream/PanicFomoMeter";
import { TickerBar } from "../../components/TickerBar";
import { AppTopBar } from "../../components/shell/AppTopBar";
import { useDataStream } from "../../hooks/useDataStream";
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { QuestionTooltip } from "../../components/ui/QuestionTooltip";
import { useI18n } from "../../context/I18nContext";

function netLabel(buyUsd30s: number, sellUsd30s: number): string {
    const net = buyUsd30s - sellUsd30s;
    const pct =
        buyUsd30s + sellUsd30s > 0 ? (net / (buyUsd30s + sellUsd30s)) * 100 : 0;
    const sign = net >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
}

export default function DataStreamPage() {
    const { t } = useI18n();
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
        snapshotTradeLimit,
        maxRecords,
        universe,
    } = useDataStream();

    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        reconnect();
        setTimeout(() => setIsRefreshing(false), 800);
    };

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            <AppTopBar
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                refreshTitle={t("dataStream.page.reconnectWebsocket")}
                refreshAriaLabel={t("dataStream.page.reconnectWebsocket")}
            />

            <main className="flex-1 min-h-0 flex overflow-hidden">
                <LeftSidebar />

                <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-main">
                    <div className="px-3 border-b border-main bg-secondary/10 shrink-0 h-[56px] flex items-center">
                        <div className="w-full flex items-center justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                                            universe === "stock"
                                                ? "bg-muted"
                                                : connectionStatus ===
                                                    "connected"
                                                  ? "bg-emerald-500 animate-pulse"
                                                  : connectionStatus === "error"
                                                    ? "bg-rose-500"
                                                    : "bg-amber-400 animate-pulse"
                                        }`}
                                    />
                                    <div className="text-[10px] text-muted uppercase tracking-widest font-bold">
                                        {universe === "stock"
                                            ? t("dataStream.page.stockStreamStatus")
                                            : connectionStatus === "connected"
                                              ? t("dataStream.page.streamingLive")
                                              : connectionStatus ===
                                                  "connecting"
                                                ? t("dataStream.page.connecting")
                                                : connectionStatus === "error"
                                                  ? t("dataStream.page.wsError")
                                                  : t(
                                                        "dataStream.page.disconnected",
                                                    )}
                                    </div>
                                </div>
                                <div className="text-[12px] text-muted font-mono">
                                    {universe === "stock" ? (
                                        <span className="text-[11px] font-sans font-normal normal-case tracking-normal">
                                            {t("dataStream.page.stockStreamHint")}
                                        </span>
                                    ) : (
                                        <>
                                            {marketType.toUpperCase()} ·{" "}
                                            {selectedSymbol}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => reset()}
                                    className="h-8 px-3 rounded-lg border border-main bg-secondary text-muted hover:text-main hover:border-accent/40 transition-colors text-[11px] font-semibold inline-flex items-center gap-1.5"
                                >
                                    <Trash2 size={13} />
                                    {t("dataStream.page.clear")}
                                </button>
                                <button
                                    type="button"
                                    onClick={reconnect}
                                    className="h-8 px-3 rounded-lg border border-main bg-secondary text-muted hover:text-main hover:border-accent/40 transition-colors text-[11px] font-semibold inline-flex items-center gap-1.5"
                                    title={t(
                                        "dataStream.page.reconnectWebsocket",
                                    )}
                                >
                                    <RefreshCw size={13} />
                                    {t("dataStream.page.reconnect")}
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

                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr]">
                        <div className="flex min-h-0 flex-col space-y-3 overflow-y-auto thin-scrollbar">
                            <DataStreamFilters
                                config={config}
                                onChange={setConfig}
                                soundEnabled={soundEnabled}
                                soundArmed={soundArmed}
                                onToggleSoundEnabled={toggleSoundEnabled}
                            />

                            <div className="flex min-h-0 flex-col space-y-3 lg:overflow-y-visible">
                                <SpeedMeter
                                    eventRate10s={metrics.eventRate10s}
                                />
                                <PanicFomoMeter
                                    panicScore={metrics.panicScore}
                                    fomoScore={metrics.fomoScore}
                                />

                                <div className="rounded-lg border border-main bg-main/50 p-3">
                                    <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest font-bold">
                                        {t("dataStream.page.imbalance30s")}
                                        <QuestionTooltip
                                            text={t(
                                                "dataStream.page.imbalanceHelp",
                                            )}
                                        />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <div className="text-[12px] font-mono text-main">
                                            {t("dataStream.page.net")}:{" "}
                                            {netLabel(
                                                metrics.buyUsd30s,
                                                metrics.sellUsd30s,
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted font-mono tabular-nums">
                                            {t("dataStream.page.buy")} $
                                            {metrics.buyUsd30s.toFixed(0)} /{" "}
                                            {t("dataStream.page.sell")} $
                                            {metrics.sellUsd30s.toFixed(0)}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[9px] text-muted">
                                        {t("dataStream.page.highlights2m")}:{" "}
                                        <span className="text-accent font-bold">
                                            {metrics.highlightCount2m}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                            <DataStreamTape
                                records={records}
                                snapshotTradeLimit={snapshotTradeLimit}
                                maxRecords={maxRecords}
                                universe={universe}
                            />
                        </div>
                    </div>
                </div>
            </main>

            <TickerBar />
        </div>
    );
}
