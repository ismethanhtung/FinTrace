"use client";

import React from "react";
import { cn } from "../../lib/utils";
import { useUniverse } from "../../context/UniverseContext";
import type { AssetUniverse } from "../../lib/marketUniverse";

const OPTIONS: { value: AssetUniverse; label: string }[] = [
    { value: "coin", label: "Coin" },
    { value: "stock", label: "Stock" },
];

export const WorldSwitch = () => {
    const { universe, routeSwitch } = useUniverse();

    return (
        <div className="flex items-center gap-1 rounded-md border border-main bg-secondary/30 p-1">
            {OPTIONS.map((option) => {
                const active = option.value === universe;
                return (
                    <button
                        key={option.value}
                        onClick={() => routeSwitch(option.value)}
                        className={cn(
                            "px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors",
                            active
                                ? "bg-accent text-white"
                                : "text-muted hover:text-main hover:bg-secondary",
                        )}
                        aria-label={`Switch to ${option.label}`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
};
