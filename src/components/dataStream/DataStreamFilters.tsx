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

                <button
                    type="button"
                    onClick={onToggleSoundEnabled}
                    className={cn(
                        "px-3 py-2 rounded-md border text-[12px] font-medium flex items-center gap-2 transition-colors",
                        soundEnabled
                            ? "bg-accent/10 border-accent/30 text-accent"
                            : "bg-main hover:bg-secondary",
                    )}
                    title={
                        soundArmed
                            ? soundEnabled
                                ? "Tắt âm thanh highlight"
                                : "Bật âm thanh highlight"
                            : "Bật âm thanh (cần click để cho phép trình duyệt)"
                    }
                >
                    <Bell
                        size={14}
                        className={cn(
                            soundArmed ? "text-accent" : "text-muted",
                        )}
                    />
                    Highlight Alert
                    <span className="text-[10px] text-muted ml-1">
                        {!soundArmed
                            ? "Click để On"
                            : soundEnabled
                              ? "On"
                              : "Off"}
                    </span>
                </button>
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
