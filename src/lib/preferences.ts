import { type AssetUniverse } from "./marketUniverse";

export type AppThemePreference =
    | "light"
    | "dark1"
    | "dark2"
    | "dark3"
    | "dark4"
    | "dark5";

export const THEME_STORAGE_KEY = "ft-theme";
export const THEME_COOKIE_KEY = "ft-theme";
export const UNIVERSE_COOKIE_KEY = "ft-asset-universe";

const THEME_SET = new Set<AppThemePreference>([
    "light",
    "dark1",
    "dark2",
    "dark3",
    "dark4",
    "dark5",
]);

export function normalizeTheme(value: unknown): AppThemePreference {
    if (typeof value !== "string") return "light";
    return THEME_SET.has(value as AppThemePreference)
        ? (value as AppThemePreference)
        : "light";
}

export function persistClientPreferenceCookie(
    key: typeof THEME_COOKIE_KEY | typeof UNIVERSE_COOKIE_KEY,
    value: AppThemePreference | AssetUniverse,
) {
    if (typeof document === "undefined") return;
    document.cookie = `${key}=${encodeURIComponent(
        value,
    )}; path=/; max-age=31536000; samesite=lax`;
}
