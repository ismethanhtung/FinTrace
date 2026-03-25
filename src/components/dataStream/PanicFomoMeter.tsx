"use client";

import React, { useMemo } from "react";
import { cn } from "../../lib/utils";
import { QuestionTooltip } from "../ui/QuestionTooltip";

export function PanicFomoMeter({
    panicScore,
    fomoScore,
}: {
    panicScore: number;
    fomoScore: number;
}) {
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
            ? "Panic"
            : fomoScore > panicScore + 0.08
              ? "FOMO"
              : "Neutral";

    const accentTone =
        label === "Panic" ? "text-rose-500" : label === "FOMO" ? "text-emerald-500" : "text-muted";

    return (
        <div className="rounded-lg border border-main bg-main/50 p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest font-bold">
                    Panic / FOMO
                    <QuestionTooltip
                        text="Panic: SELL-dominant + tốc độ cao. FOMO: BUY-dominant + tốc độ cao. Meter phản ánh 'nhịp' và 'phe nào chiếm ưu thế' trong cửa sổ gần nhất."
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
                        Panic: {(panicScore * 100).toFixed(0)}%
                    </span>
                    <span>
                        FOMO: {(fomoScore * 100).toFixed(0)}%
                    </span>
                </div>
            </div>
        </div>
    );
}

