"use client";

import React from "react";
import { useI18n } from "../../context/I18nContext";

// SVG flags, round style
const FlagVN = () => (
    <span
        className="inline-flex items-center justify-center rounded-full overflow-hidden"
        style={{ width: 18, height: 18, background: "#da251d" }}
    >
        <svg viewBox="0 0 32 32" width={18} height={18}>
            <circle cx="16" cy="16" r="16" fill="#da251d" />
            <polygon
                points="16,7 17.902,12.901 24.218,12.901 19.158,16.398 21.06,22.299 16,18.803 10.94,22.299 12.842,16.398 7.782,12.901 14.098,12.901"
                fill="#ff0"
            />
        </svg>
    </span>
);

const FlagUK = () => (
    <span
        className="inline-flex items-center justify-center rounded-full overflow-hidden"
        style={{ width: 18, height: 18, background: "#00247d" }}
    >
        <svg viewBox="0 0 32 32" width={18} height={18}>
            <circle cx="16" cy="16" r="16" fill="#00247d" />
            <g>
                <rect x="14" y="0" width="4" height="32" fill="#fff" />
                <rect x="0" y="14" width="32" height="4" fill="#fff" />
                <rect x="15" y="0" width="2" height="32" fill="#cf142b" />
                <rect x="0" y="15" width="32" height="2" fill="#cf142b" />
                <polygon points="0,0 6,0 32,26 32,32 26,32 0,6" fill="#fff" />
                <polygon points="32,0 26,0 0,26 0,32 6,32 32,6" fill="#fff" />
                <polygon
                    points="0,0 2.6,0 32,29.4 32,32 29.4,32 0,2.6"
                    fill="#cf142b"
                />
                <polygon
                    points="32,0 29.4,0 0,29.4 0,32 2.6,32 32,2.6"
                    fill="#cf142b"
                />
            </g>
        </svg>
    </span>
);

export function LocaleSwitch() {
    const { locale, setLocale, t } = useI18n();
    const nextLocale = locale === "vi" ? "en" : "vi";
    const localeName =
        locale === "vi" ? t("common.vietnamese") : t("common.english");

    return (
        <button
            onClick={() => setLocale(nextLocale)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main"
            title={t("localeSwitch.title", { locale: localeName })}
            aria-label={t("localeSwitch.title", { locale: localeName })}
        >
            {locale === "vi" ? <FlagVN /> : <FlagUK />}
            <span className="text-[11px] font-medium hidden sm:inline">
                {locale === "vi" ? "VI" : "EN"}
            </span>
        </button>
    );
}
