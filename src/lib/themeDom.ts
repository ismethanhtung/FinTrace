import type { AppThemePreference } from "./preferences";

export const THEME_TRANSITION_LOCK_CLASS = "theme-switching";
const THEME_TRANSITION_LOCK_MS = 120;

let unlockTimer: number | null = null;

export function getColorSchemeForTheme(theme: AppThemePreference): "light" | "dark" {
    return theme === "light" ? "light" : "dark";
}

function lockThemeTransitions(root: HTMLElement) {
    root.classList.add(THEME_TRANSITION_LOCK_CLASS);
    if (unlockTimer !== null) {
        window.clearTimeout(unlockTimer);
    }
    unlockTimer = window.setTimeout(() => {
        root.classList.remove(THEME_TRANSITION_LOCK_CLASS);
        unlockTimer = null;
    }, THEME_TRANSITION_LOCK_MS);
}

export function applyThemeToDocument(
    theme: AppThemePreference,
    options?: { disableTransitions?: boolean },
) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (!root) return;

    if (options?.disableTransitions) {
        lockThemeTransitions(root);
    }
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = getColorSchemeForTheme(theme);
}

