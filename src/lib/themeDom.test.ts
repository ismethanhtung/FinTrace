// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import {
    applyThemeToDocument,
    getColorSchemeForTheme,
    THEME_TRANSITION_LOCK_CLASS,
} from "./themeDom";

describe("themeDom", () => {
    it("maps theme to color scheme", () => {
        expect(getColorSchemeForTheme("light")).toBe("light");
        expect(getColorSchemeForTheme("dark1")).toBe("dark");
        expect(getColorSchemeForTheme("dark5")).toBe("dark");
    });

    it("applies data-theme and color-scheme to document", () => {
        applyThemeToDocument("dark3");
        expect(document.documentElement.getAttribute("data-theme")).toBe(
            "dark3",
        );
        expect(document.documentElement.style.colorScheme).toBe("dark");
    });

    it("temporarily disables transitions when requested", () => {
        vi.useFakeTimers();
        applyThemeToDocument("light", { disableTransitions: true });
        expect(
            document.documentElement.classList.contains(
                THEME_TRANSITION_LOCK_CLASS,
            ),
        ).toBe(true);

        vi.advanceTimersByTime(130);

        expect(
            document.documentElement.classList.contains(
                THEME_TRANSITION_LOCK_CLASS,
            ),
        ).toBe(false);
    });
});

