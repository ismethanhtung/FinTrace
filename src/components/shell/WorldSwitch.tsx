"use client";

import React from "react";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { useUniverse } from "../../context/UniverseContext";
import type { AssetUniverse } from "../../lib/marketUniverse";
import { useI18n } from "../../context/I18nContext";
import { type TranslationKey } from "../../i18n/translate";

const OPTIONS: { value: AssetUniverse; labelKey: TranslationKey }[] = [
    { value: "coin", labelKey: "common.coin" },
    { value: "stock", labelKey: "common.stock" },
];

export const WorldSwitch = () => {
    const { t } = useI18n();
    const { universe, routeSwitch, isMockUniverse } = useUniverse();
    const primaryOption = OPTIONS[0];
    const secondaryOption = OPTIONS[1];

    const renderOption = (
        option: { value: AssetUniverse; labelKey: TranslationKey },
    ) => {
        const active = option.value === universe;
        const isStock = option.value === "stock";
        const label = t(option.labelKey);

        const buttonClass = cn(
            "h-6 px-2.5 rounded border text-[9px] font-semibold uppercase tracking-wider transition-colors",
            active && isStock
                ? "border-amber-400/40 bg-amber-400/15 text-amber-500"
                : active && !isStock
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500"
                  : "border-main text-muted hover:text-main hover:bg-secondary",
        );

        return (
            <button
                key={option.value}
                onClick={() => routeSwitch(option.value)}
                className={buttonClass}
                aria-label={t("common.switchTo", { label })}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="flex items-center gap-2">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-md  bg-secondary/30 p-1">
                {renderOption(primaryOption)}
                <span className="flex items-center justify-center text-muted">
                    <ArrowLeftRight size={10} />
                </span>
                {renderOption(secondaryOption)}
            </div>
            {isMockUniverse && (
                <span className="px-1.5 py-0.5 rounded text-amber-400 text-[9px] font-bold uppercase tracking-wide">
                    {t("common.beta")}
                </span>
            )}
        </div>
    );
};
