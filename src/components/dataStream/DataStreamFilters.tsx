"use client";

import React from "react";
import { cn } from "../../lib/utils";
import type { DataStreamConfig } from "../../lib/dataStream/types";
import { DollarSign, Bell, Volume2, Search } from "lucide-react";
import { useI18n } from "../../context/I18nContext";

export function DataStreamFilters({
    config,
    onChange,
    soundEnabled,
    soundArmed,
    onToggleSoundEnabled,
}: {
    config: DataStreamConfig;
    onChange: (next: DataStreamConfig) => void;
    soundEnabled: boolean;
    soundArmed: boolean;
    onToggleSoundEnabled: () => void;
}) {
    const { t } = useI18n();
    const setNum = (key: keyof DataStreamConfig, v: number) => {
        onChange({ ...config, [key]: v });
    };

    const onToggle = (
        key: "showBuy" | "showSell" | "showFunding" | "showHighlightOnly",
    ) => {
        onChange({ ...config, [key]: !config[key] });
    };

    return (
        <div className="rounded-xl border border-main bg-secondary/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest font-bold">
                        <Volume2 size={13} className="text-muted" />
                        {t("dataStream.filters.smartFilters")}
                    </div>
                    <div className="text-[12px] text-muted">
                        {t("dataStream.filters.smartFiltersHint")}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 bg-main/40 px-2.5 py-1.5">
                    <span className="text-[11px] font-semibold text-muted leading-none">
                        {t("dataStream.filters.highlightAlert")}
                    </span>
                    <button
                        type="button"
                        onClick={onToggleSoundEnabled}
                        aria-pressed={soundArmed && soundEnabled}
                        className={cn(
                            "h-7 rounded-md border px-2.5 text-[10px] font-semibold transition-colors inline-flex items-center gap-1.5",
                            !soundArmed
                                ? "border-main bg-secondary text-main hover:border-accent/40"
                                : soundEnabled
                                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-400"
                                  : "border-main bg-secondary/40 text-muted hover:text-main hover:border-accent/40",
                        )}
                        title={
                            soundArmed
                                ? soundEnabled
                                    ? t("dataStream.filters.soundOffTitle")
                                    : t("dataStream.filters.soundOnTitle")
                                : t("dataStream.filters.soundArmTitle")
                        }
                    >
                        <Bell
                            size={12}
                            className={cn(
                                "shrink-0",
                                !soundArmed && "text-muted",
                                soundArmed &&
                                    soundEnabled &&
                                    "text-emerald-400",
                                soundArmed && !soundEnabled && "text-muted",
                            )}
                        />
                        {!soundArmed
                            ? t("dataStream.filters.soundOn")
                            : soundEnabled
                              ? t("dataStream.filters.soundOn")
                              : t("dataStream.filters.soundOff")}
                    </button>
                </div>
            </div>

            {/* Hàng 1: chỉ Min Volume + Highlight (cùng hàng trên md+) */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                        <DollarSign size={12} />
                        {t("dataStream.filters.minVolumeUsd")}
                    </div>
                    <input
                        type="number"
                        value={config.minVolumeUsd}
                        min={0}
                        step={100}
                        onChange={(e) =>
                            setNum("minVolumeUsd", Number(e.target.value || 0))
                        }
                        className="w-full rounded-md border border-main bg-main px-3 py-2 font-mono text-[12px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                        <DollarSign size={12} />
                        {t("dataStream.filters.highlightBuyUsd")}
                    </div>
                    <input
                        type="number"
                        value={config.highlightUsd}
                        min={0}
                        step={1000}
                        onChange={(e) =>
                            setNum("highlightUsd", Number(e.target.value || 0))
                        }
                        className="w-full rounded-md border border-main bg-main px-3 py-2 font-mono text-[12px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                </div>
            </div>

            {/* Hàng 2: Event Toggles — tách riêng, style giống tape filter (Transactions) */}
            <div className="border-t border-main pt-3">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                    <Search size={12} />
                    {t("dataStream.filters.eventToggles")}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {(
                        [
                            { key: "showBuy", label: t("dataStream.filters.buy") },
                            {
                                key: "showSell",
                                label: t("dataStream.filters.sell"),
                            },
                            {
                                key: "showFunding",
                                label: t("dataStream.filters.funding"),
                            },
                            {
                                key: "showHighlightOnly",
                                label: t("dataStream.filters.highlightOnly"),
                            },
                        ] as const
                    ).map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => onToggle(t.key)}
                            className={cn(
                                "rounded-md border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors",
                                config[t.key]
                                    ? "border-accent/30 bg-accent/15 text-accent"
                                    : "border-transparent text-muted hover:bg-secondary hover:text-main",
                            )}
                        >
                            {t.label}
                        </button>
                    ))}

                    <span
                        className="mx-1 hidden h-3 w-px bg-main sm:inline-block"
                        aria-hidden
                    />

                    <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-md border border-dashed border-main bg-secondary/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted opacity-60"
                        title={t("dataStream.filters.whaleAlertSoonTitle")}
                    >
                        {t("dataStream.filters.whaleAlertSoon")}
                    </button>
                    <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-md border border-dashed border-main bg-secondary/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted opacity-60"
                        title={t(
                            "dataStream.filters.liquidityChangesSoonTitle",
                        )}
                    >
                        {t("dataStream.filters.liquidityChangesSoon")}
                    </button>
                    <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-md border border-dashed border-main bg-secondary/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted opacity-60"
                        title={t("dataStream.filters.socialPulseSoonTitle")}
                    >
                        {t("dataStream.filters.socialPulseSoon")}
                    </button>
                </div>
            </div>
        </div>
    );
}
