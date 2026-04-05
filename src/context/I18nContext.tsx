"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    type AppLocale,
    getMessagesByLocale,
    LOCALE_COOKIE_KEY,
    LOCALE_STORAGE_KEY,
    normalizeLocale,
    SUPPORTED_LOCALES,
} from "../i18n/config";
import {
    type TranslationKey,
    type TranslationValues,
    translate,
} from "../i18n/translate";

type I18nContextValue = {
    locale: AppLocale;
    setLocale: (locale: AppLocale) => void;
    supportedLocales: readonly AppLocale[];
    t: (key: TranslationKey, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function persistLocale(locale: AppLocale) {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.cookie = `${LOCALE_COOKIE_KEY}=${encodeURIComponent(
        locale,
    )}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({
    children,
    initialLocale,
}: {
    children: React.ReactNode;
    initialLocale: AppLocale;
}) {
    const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

    useEffect(() => {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
        const normalized = normalizeLocale(stored);
        if (normalized !== locale) {
            setLocaleState(normalized);
        } else {
            persistLocale(normalized);
        }
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale;
        persistLocale(locale);
    }, [locale]);

    const value = useMemo<I18nContextValue>(() => {
        const messages = getMessagesByLocale(locale);

        return {
            locale,
            supportedLocales: SUPPORTED_LOCALES,
            setLocale: setLocaleState,
            t: (key, values) => translate(messages, key, values),
        };
    }, [locale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useI18n must be used within I18nProvider");
    }

    return context;
}
