"use client";

import React from "react";
import { cn } from "../../lib/utils";
import type { StreamRecord } from "../../lib/dataStream/types";
import { Loader2 } from "lucide-react";
import { useI18n } from "../../context/I18nContext";

const GRID = "grid grid-cols-6 gap-x-3 px-3 items-center min-w-0";

export function DataStreamTape({
    records,
    snapshotTradeLimit,
    maxRecords,
}: {
    records: StreamRecord[];
    snapshotTradeLimit: number;
    maxRecords: number;
}) {
    const { t } = useI18n();
    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden border border-main rounded-xl">
            <div className="px-3 py-3 border-b border-main bg-secondary/10 shrink-0 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-main">
                    {t("dataStream.tape.title")}
                </span>
                <span className="inline-flex items-center gap-2 text-[10px] text-muted font-mono tabular-nums">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
                    <div className="h-full flex items-center justify-center px-3 text-[11px] text-muted text-center">
                        <Loader2 size={12} className="animate-spin" />
                    </div>
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
