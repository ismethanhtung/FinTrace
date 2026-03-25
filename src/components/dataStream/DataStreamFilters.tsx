"use client";

import React from "react";
import { cn } from "../../lib/utils";
import type { DataStreamConfig } from "../../lib/dataStream/types";
import { DollarSign, Bell, Volume2, Search } from "lucide-react";

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
    const setNum = (key: keyof DataStreamConfig, v: number) => {
        onChange({ ...config, [key]: v });
    };

    const onToggle = (key: "showBuy" | "showSell" | "showFunding") => {
        onChange({ ...config, [key]: !config[key] });
    };

    return (
        <div className="rounded-xl border border-main bg-secondary/10 p-4 space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest font-bold">
                        <Volume2 size={13} className="text-muted" />
                        Smart Filters
                    </div>
                    <div className="text-[12px] text-muted">
                        Giảm rác + ưu tiên tín hiệu lớn.
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted leading-none">
                        Highlight Alert
                    </span>
                    <button
                        type="button"
                        onClick={onToggleSoundEnabled}
                        aria-pressed={soundArmed && soundEnabled}
                        className={cn(
                            "rounded-md border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5",
                            !soundArmed
                                ? "border-main bg-secondary/25 text-main hover:bg-secondary"
                                : soundEnabled
                                  ? "border-accent/30 bg-accent/15 text-accent"
                                  : "border-transparent text-muted hover:bg-secondary hover:text-main",
                        )}
                        title={
                            soundArmed
                                ? soundEnabled
                                    ? "Tắt âm thanh highlight"
                                    : "Bật âm thanh highlight"
                                : "Nhấn để cho phép trình duyệt phát âm thanh cảnh báo"
                        }
                    >
                        <Bell
                            size={11}
                            className={cn(
                                "shrink-0",
                                !soundArmed && "text-muted",
                                soundArmed && soundEnabled && "text-accent",
                                soundArmed && !soundEnabled && "text-muted",
                            )}
                        />
                        {!soundArmed
                            ? "Kích hoạt"
                            : soundEnabled
                              ? "Bật"
                              : "Tắt"}
                    </button>
                </div>
            </div>

            {/* Hàng 1: chỉ Min Volume + Highlight (cùng hàng trên md+) */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                        <DollarSign size={12} />
                        Min Volume (USD)
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
                        Highlight (BUY &gt;= USD)
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
                    Event Toggles
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {(
                        [
                            { key: "showBuy", label: "BUY" },
                            { key: "showSell", label: "SELL" },
                            { key: "showFunding", label: "FUNDING" },
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
                        title="Coming soon (on-chain realtime + whale provider)"
                    >
                        Whale Alert Soon
                    </button>
                    <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-md border border-dashed border-main bg-secondary/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted opacity-60"
                        title="Coming soon (liquidity pool realtime)"
                    >
                        Liquidity Changes Soon
                    </button>
                    <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-md border border-dashed border-main bg-secondary/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted opacity-60"
                        title="Coming soon (social pulse realtime)"
                    >
                        Social Pulse Soon
                    </button>
                </div>
            </div>
        </div>
    );
}
