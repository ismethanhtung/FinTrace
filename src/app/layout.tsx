import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { MarketProvider } from "../context/MarketContext";
import { AppSettingsProvider } from "../context/AppSettingsContext";
import { UniverseProvider } from "../context/UniverseContext";
import { normalizeUniverse } from "../lib/marketUniverse";
import {
    normalizeTheme,
    THEME_COOKIE_KEY,
    UNIVERSE_COOKIE_KEY,
} from "../lib/preferences";
import { getColorSchemeForTheme } from "../lib/themeDom";
import { I18nProvider } from "../context/I18nContext";
import { LOCALE_COOKIE_KEY, normalizeLocale } from "../i18n/config";

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});

const THEME_BOOTSTRAP_SCRIPT = `
(() => {
  try {
    const raw = localStorage.getItem("ft-theme");
    const allowed = new Set(["light","dark1","dark2","dark3","dark4","dark5"]);
    const next = allowed.has(raw) ? raw : null;
    const fallback = document.documentElement.getAttribute("data-theme");
    const applied = next || fallback;
    if (applied) {
      document.documentElement.style.colorScheme = applied === "light" ? "light" : "dark";
    }
    if (next) {
      document.documentElement.setAttribute("data-theme", next);
    }
  } catch {}
})();
`;

export const metadata: Metadata = {
    title: "FinTrace - Real-time Financial Analysis",
    description: "Advanced financial tracking and AI-driven analysis",
    icons: {
        icon: "/favicon.svg",
        shortcut: "/favicon.svg",
        apple: "/favicon.svg",
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const initialTheme = normalizeTheme(
        cookieStore.get(THEME_COOKIE_KEY)?.value,
    );
    const initialUniverse = normalizeUniverse(
        cookieStore.get(UNIVERSE_COOKIE_KEY)?.value,
    );
    const initialLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

    return (
        <html
            lang={initialLocale}
            data-theme={initialTheme}
            style={{ colorScheme: getColorSchemeForTheme(initialTheme) }}
            suppressHydrationWarning
        >
            <head>
                <script
                    dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
                />
            </head>
            <body className={`${jetbrainsMono.variable} antialiased`}>
                <I18nProvider initialLocale={initialLocale}>
                    <AppSettingsProvider initialTheme={initialTheme}>
                        <UniverseProvider initialUniverse={initialUniverse}>
                            <MarketProvider>{children}</MarketProvider>
                        </UniverseProvider>
                    </AppSettingsProvider>
                </I18nProvider>
            </body>
        </html>
    );
}
