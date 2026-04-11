"use client";

import React from "react";
import { cn } from "../../lib/utils";
import type { StreamRecord } from "../../lib/dataStream/types";
import { Loader2 } from "lucide-react";
import { useI18n } from "../../context/I18nContext";
import type { AssetUniverse } from "../../lib/marketUniverse";
import type { DataStreamConnectionStatus } from "../../hooks/useDataStream";

const GRID = "grid grid-cols-6 gap-x-3 px-3 items-center min-w-0";

export function DataStreamTape({
    records,
    snapshotTradeLimit,
    maxRecords,
    universe,
    connectionStatus,
    minVolumeUsd,
}: {
    records: StreamRecord[];
    snapshotTradeLimit: number;
    maxRecords: number;
    universe: AssetUniverse;
    connectionStatus: DataStreamConnectionStatus;
    minVolumeUsd: number;
}) {
    const { t } = useI18n();
    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden border border-main rounded-xl">
            <div className="px-3 py-3 border-b border-main bg-secondary/10 shrink-0 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-main">
                    {t("dataStream.tape.title")}
                </span>
                <span className="inline-flex items-center gap-2 text-[10px] text-muted font-mono tabular-nums">
                    <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                            universe === "stock"
                                ? "bg-muted"
                                : "bg-emerald-500 animate-pulse"
                        }`}
                    />
                </span>
            </div>

            <div
                className={cn(
                    GRID,
                    "py-2 text-[9px] font-semibold uppercase tracking-wider text-muted border-b border-main bg-secondary/10 shrink-0",
                )}
            >
                <span className="text-left">{t("dataStream.tape.time")}</span>
                <span className="text-left">{t("dataStream.tape.action")}</span>
                <span className="text-left">{t("dataStream.tape.token")}</span>
                <span className="text-right">{t("dataStream.tape.value")}</span>
                <span className="text-left">{t("dataStream.tape.source")}</span>
                <span className="text-left">
                    {t("dataStream.tape.details")}
                </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
                {records.length === 0 ? (
                    universe === "stock" ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                            <div className="text-[12px] font-bold uppercase tracking-widest text-muted">
                                {t("dataStream.tape.stockSoonTitle")}
                            </div>
                            <p className="text-[11px] text-muted leading-relaxed max-w-sm">
                                {t("dataStream.tape.stockSoonHint")}
                            </p>
                        </div>
                    ) : connectionStatus === "connected" ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                            <Loader2 size={14} className="animate-spin text-muted" />
                            <p className="text-[11px] text-muted leading-relaxed max-w-xs">
                                {t("dataStream.tape.waitingTrades")}
                                {minVolumeUsd > 0 && (
                                    <span className="block mt-1 text-[10px] opacity-70">
                                        {t("dataStream.tape.filterHint", {
                                            amount: minVolumeUsd >= 1_000_000
                                                ? `$${(minVolumeUsd / 1_000_000).toFixed(1)}M`
                                                : minVolumeUsd >= 1_000
                                                  ? `$${(minVolumeUsd / 1_000).toFixed(0)}K`
                                                  : `$${minVolumeUsd}`,
                                        })}
                                    </span>
                                )}
                            </p>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center px-3 text-[11px] text-muted text-center">
                            <Loader2 size={12} className="animate-spin" />
                        </div>
                    )
                ) : (
                    records.map((r) => {
                        const toneClass =
                            r.tone === "accent"
                                ? "bg-accent/10 text-accent border-accent/30"
                                : r.tone === "up"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : r.tone === "down"
                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                    : "bg-secondary/40 text-muted border-main/30";
                        return (
                            <div
                                key={r.id}
                                className={cn(
                                    GRID,
                                    "py-[3px] border-b border-main last:border-0 hover:bg-secondary",
                                )}
                            >
                                <span className="text-[10px] font-mono tabular-nums text-muted whitespace-nowrap">
                                    {r.timeLabel}
                                </span>

                                <span className="min-w-0 flex items-center">
                                    <span
                                        className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono tabular-nums",
                                            toneClass,
                                        )}
                                    >
                                        {r.action}
                                    </span>
                                </span>

                                <span className="text-[10px] font-mono tabular-nums text-main truncate">
                                    {r.token}
                                </span>

                                <span className="text-right text-[10px] font-mono font-semibold tabular-nums text-main">
                                    {r.valueText}
                                </span>

                                <span className="text-[10px] text-muted font-mono tabular-nums truncate">
                                    {r.source}
                                </span>

                                <span className="text-[10px] text-muted font-mono tabular-nums truncate">
                                    {r.details ?? "--"}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
