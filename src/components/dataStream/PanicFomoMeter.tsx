"use client";

import React, { useMemo } from "react";
import { cn } from "../../lib/utils";
import { QuestionTooltip } from "../ui/QuestionTooltip";
import { useI18n } from "../../context/I18nContext";

export function PanicFomoMeter({
    panicScore,
    fomoScore,
}: {
    panicScore: number;
    fomoScore: number;
}) {
    const { t } = useI18n();
    const { leftPct, rightPct } = useMemo(() => {
        const panic = Math.max(0, Math.min(1, panicScore));
        const fomo = Math.max(0, Math.min(1, fomoScore));
        // Make them compete for a fixed 0..100 bar.
        const raw = panic + fomo;
        if (raw <= 0) return { leftPct: 50, rightPct: 50 };
        const leftPct = (panic / raw) * 100;
        const rightPct = 100 - leftPct;
        return { leftPct, rightPct };
    }, [panicScore, fomoScore]);

    const label =
        panicScore > fomoScore + 0.08
            ? t("dataStream.panicFomo.panic")
            : fomoScore > panicScore + 0.08
              ? t("dataStream.panicFomo.fomo")
              : t("dataStream.panicFomo.neutral");

    const accentTone =
        label === t("dataStream.panicFomo.panic")
            ? "text-rose-500"
            : label === t("dataStream.panicFomo.fomo")
              ? "text-emerald-500"
              : "text-muted";

    return (
        <div className="rounded-lg border border-main bg-main/50 p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest font-bold">
                    {t("dataStream.panicFomo.title")}
                    <QuestionTooltip
                        text={t("dataStream.panicFomo.tooltip")}
                    />
                </div>
                <div className={cn("text-[12px] font-mono font-semibold tabular-nums", accentTone)}>
                    {label}
                </div>
            </div>

            <div className="mt-3">
                <div className="h-2 rounded-full bg-secondary/60 overflow-hidden flex">
                    <div
                        className="h-full"
                        style={{ width: `${leftPct}%`, background: "var(--color-down, #ef4444)" }}
                    />
                    <div
                        className="h-full"
                        style={{ width: `${rightPct}%`, background: "var(--color-up, #22c55e)" }}
                    />
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px] text-muted font-mono">
                    <span>
                        {t("dataStream.panicFomo.panic")}:{" "}
                        {(panicScore * 100).toFixed(0)}%
                    </span>
                    <span>
                        {t("dataStream.panicFomo.fomo")}:{" "}
                        {(fomoScore * 100).toFixed(0)}%
                    </span>
                </div>
            </div>
        </div>
    );
}
