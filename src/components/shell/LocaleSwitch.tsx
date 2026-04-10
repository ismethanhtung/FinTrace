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
        <svg
            viewBox="0 0 32 32"
            width="18"
            height="18"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <clipPath id="circleView">
                    <circle cx="16" cy="16" r="16" />
                </clipPath>
            </defs>

            <g clipPath="url(#circleView)">
                <rect width="32" height="32" fill="#012169" />

                <path
                    d="M0,0 L32,32 M32,0 L0,32"
                    stroke="#fff"
                    strokeWidth="4"
                />

                <path
                    d="M0,0 L16,16 M32,32 L16,16 M0,32 L16,16 M32,0 L16,16"
                    stroke="#C8102E"
                    strokeWidth="1.5"
                    strokeDasharray="16"
                    strokeDashoffset="16"
                />

                <path
                    d="M0,0 L16,16 M32,32 L16,16"
                    stroke="#C8102E"
                    strokeWidth="1.3"
                    transform="translate(0, 1)"
                />
                <path
                    d="M32,0 L16,16 M0,32 L16,16"
                    stroke="#C8102E"
                    strokeWidth="1.3"
                    transform="translate(1, 0)"
                />

                <path d="M16,0 V32 M0,16 H32" stroke="#fff" strokeWidth="6" />

                <path
                    d="M16,0 V32 M0,16 H32"
                    stroke="#C8102E"
                    strokeWidth="3.5"
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
