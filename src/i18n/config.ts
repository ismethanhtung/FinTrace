import { enMessages, type Messages } from "./messages/en";
import { viMessages } from "./messages/vi";

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE_KEY = "ft-locale";
export const LOCALE_STORAGE_KEY = "ft-locale";

const LOCALE_SET = new Set<AppLocale>(SUPPORTED_LOCALES);

const MESSAGES_BY_LOCALE: Record<AppLocale, Messages> = {
    vi: viMessages,
    en: enMessages,
};

export function isSupportedLocale(value: unknown): value is AppLocale {
    return typeof value === "string" && LOCALE_SET.has(value as AppLocale);
}

export function normalizeLocale(value: unknown): AppLocale {
    return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

export function detectLocaleFromAcceptLanguage(
    acceptLanguage: string | null,
): AppLocale {
    if (acceptLanguage == null || acceptLanguage.length === 0) {
        return DEFAULT_LOCALE;
    }

    const lowered = acceptLanguage.toLowerCase();
    if (lowered.includes("vi")) return "vi";
    if (lowered.includes("en")) return "en";

    return DEFAULT_LOCALE;
}

export function getMessagesByLocale(locale: AppLocale): Messages {
    return MESSAGES_BY_LOCALE[locale];
}
