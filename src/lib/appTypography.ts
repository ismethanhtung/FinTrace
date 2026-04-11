/**
 * UI font family — mỗi giá trị phải có bản tương ứng trong `next/font` (layout.tsx)
 * và selector `html[data-app-font="…"]` trong globals.css.
 */
export type AppFont =
    | "Inter"
    | "Outfit"
    | "Plus Jakarta Sans"
    | "IBM Plex Sans"
    | "Space Grotesk";

export const APP_FONTS: AppFont[] = [
    "Inter",
    "Outfit",
    "Plus Jakarta Sans",
    "IBM Plex Sans",
    "Space Grotesk",
];

const FONT_SET = new Set<string>(APP_FONTS);

export const DEFAULT_APP_FONT: AppFont = "Plus Jakarta Sans";

export const FONT_STORAGE_KEY = "ft-font";
export const FONT_COOKIE_KEY = "ft-font";

/** Giá trị `data-app-font` trên `<html>` (ASCII, không khoảng trắng). */
export type AppFontDataAttr =
    | "inter"
    | "outfit"
    | "plus-jakarta-sans"
    | "ibm-plex-sans"
    | "space-grotesk";

export function isAppFont(value: unknown): value is AppFont {
    return typeof value === "string" && FONT_SET.has(value);
}

export function normalizeAppFont(value: unknown): AppFont {
    return isAppFont(value) ? value : DEFAULT_APP_FONT;
}

export function appFontToDataAttr(font: AppFont): AppFontDataAttr {
    switch (font) {
        case "Inter":
            return "inter";
        case "Outfit":
            return "outfit";
        case "Plus Jakarta Sans":
            return "plus-jakarta-sans";
        case "IBM Plex Sans":
            return "ibm-plex-sans";
        case "Space Grotesk":
            return "space-grotesk";
    }
}

export function appFontFromDataAttr(
    slug: string | null | undefined,
): AppFont | null {
    if (!slug) return null;
    switch (slug.trim()) {
        case "inter":
            return "Inter";
        case "outfit":
            return "Outfit";
        case "plus-jakarta-sans":
            return "Plus Jakarta Sans";
        case "ibm-plex-sans":
            return "IBM Plex Sans";
        case "space-grotesk":
            return "Space Grotesk";
        default:
            return null;
    }
}

/** `font-family` cho preview (card Settings) — dùng biến từ next/font trên `html`. */
export const FONT_PREVIEW_FAMILY: Record<AppFont, string> = {
    Inter: 'var(--font-app-inter), ui-sans-serif, system-ui, sans-serif',
    Outfit: 'var(--font-app-outfit), ui-sans-serif, system-ui, sans-serif',
    "Plus Jakarta Sans":
        'var(--font-app-plus-jakarta), ui-sans-serif, system-ui, sans-serif',
    "IBM Plex Sans":
        'var(--font-app-ibm-plex), ui-sans-serif, system-ui, sans-serif',
    "Space Grotesk":
        'var(--font-app-space-grotesk), ui-sans-serif, system-ui, sans-serif',
};

export function applyAppFontToDocument(font: AppFont): void {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute(
        "data-app-font",
        appFontToDataAttr(font),
    );
}

export function persistAppFontClientCookie(font: AppFont): void {
    if (typeof document === "undefined") return;
    const slug = appFontToDataAttr(font);
    document.cookie = `${FONT_COOKIE_KEY}=${encodeURIComponent(slug)}; path=/; max-age=31536000; samesite=lax`;
}

export function readAppFontFromCookieValue(
    raw: string | undefined,
): AppFont | null {
    if (!raw) return null;
    try {
        const decoded = decodeURIComponent(raw);
        return appFontFromDataAttr(decoded);
    } catch {
        return appFontFromDataAttr(raw);
    }
}
