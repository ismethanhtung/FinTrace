"use client";

import React from "react";
import { cn } from "../../lib/utils";
import { QuestionTooltip } from "../ui/QuestionTooltip";
import { useI18n } from "../../context/I18nContext";

export function SpeedMeter({ eventRate10s }: { eventRate10s: number }) {
    const { t } = useI18n();
    const speed = Math.max(0, eventRate10s);
    const pct = Math.min(100, (speed / 40) * 100); // saturate at 40 events/sec
    const hot = speed >= 20;

    return (
        <div className="rounded-lg border border-main bg-main/50 p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest font-bold">
                    {t("dataStream.speed.title")}
                    <QuestionTooltip text={t("dataStream.speed.tooltip")} />
                </div>
                <div
                    className={cn(
                        "text-[12px] font-mono font-semibold tabular-nums",
                        hot ? "text-rose-500" : "text-main",
                    )}
                >
                    {speed.toFixed(1)}/s
                </div>
            </div>

            <div className="mt-2 h-2 rounded-full bg-secondary/60 overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-[width] duration-150",
                        hot ? "bg-rose-500" : "bg-emerald-500",
                    )}
                    style={{ width: `${pct}%` }}
                />
            </div>

            <div className="mt-1 text-[9px] text-muted">
                {hot
                    ? t("dataStream.speed.stateFire")
                    : speed >= 8
                      ? t("dataStream.speed.stateHot")
                      : t("dataStream.speed.stateStable")}
            </div>
        </div>
    );
}
