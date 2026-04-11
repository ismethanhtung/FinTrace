import type { Metadata } from "next";
import {
    IBM_Plex_Sans,
    Inter,
    JetBrains_Mono,
    Outfit,
    Plus_Jakarta_Sans,
    Space_Grotesk,
} from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
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
import { AuthSessionProvider } from "../components/providers/AuthSessionProvider";
import { auth } from "../auth";
import { ensureUserDataIndexes } from "../lib/db/database";
import { getUserTwoFactor } from "../lib/server/repositories/userTwoFactorRepo";
import {
    getTwoFactorLoginCookieName,
    verifyTwoFactorLoginCookieValue,
} from "../lib/server/security/twoFactor";
import { TwoFactorLoginGate } from "../components/auth/TwoFactorLoginGate";
import {
    DEFAULT_APP_FONT,
    FONT_COOKIE_KEY,
    appFontToDataAttr,
    readAppFontFromCookieValue,
} from "../lib/appTypography";

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});
const inter = Inter({
    subsets: ["latin"],
    variable: "--font-app-inter",
    display: "swap",
});
const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-app-outfit",
    display: "swap",
});
const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-app-plus-jakarta",
    display: "swap",
});
const ibmPlexSans = IBM_Plex_Sans({
    weight: ["300", "400", "500", "600", "700"],
    subsets: ["latin"],
    variable: "--font-app-ibm-plex",
    display: "swap",
});
const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-app-space-grotesk",
    display: "swap",
});

const appFontVariableClassName = [
    inter.variable,
    outfit.variable,
    plusJakartaSans.variable,
    ibmPlexSans.variable,
    spaceGrotesk.variable,
    jetbrainsMono.variable,
].join(" ");

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

const FONT_BOOTSTRAP_SCRIPT = `
(() => {
  try {
    const map = {"Inter":"inter","Outfit":"outfit","Plus Jakarta Sans":"plus-jakarta-sans","IBM Plex Sans":"ibm-plex-sans","Space Grotesk":"space-grotesk"};
    const raw = localStorage.getItem("ft-font");
    const slug = raw && map[raw];
    if (slug) document.documentElement.setAttribute("data-app-font", slug);
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
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const initialTheme = normalizeTheme(
        cookieStore.get(THEME_COOKIE_KEY)?.value,
    );
    const initialUniverse = normalizeUniverse(
        cookieStore.get(UNIVERSE_COOKIE_KEY)?.value,
    );
    const initialLocale = normalizeLocale(
        cookieStore.get(LOCALE_COOKIE_KEY)?.value,
    );
    const initialAppFont =
        readAppFontFromCookieValue(
            cookieStore.get(FONT_COOKIE_KEY)?.value,
        ) ?? DEFAULT_APP_FONT;
    let requiresTwoFactorGate = false;
    if (userId) {
        await ensureUserDataIndexes();
        const twoFactor = await getUserTwoFactor(userId);
        if (twoFactor?.enabled) {
            const cookieValue = cookieStore.get(
                getTwoFactorLoginCookieName(),
            )?.value;
            requiresTwoFactorGate = !verifyTwoFactorLoginCookieValue(
                cookieValue,
                userId,
            );
        }
    }

    return (
        <html
            lang={initialLocale}
            data-theme={initialTheme}
            data-app-font={appFontToDataAttr(initialAppFont)}
            className={appFontVariableClassName}
            style={{ colorScheme: getColorSchemeForTheme(initialTheme) }}
            suppressHydrationWarning
        >
            <head>
                <Script
                    id="ft-theme-bootstrap"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
                />
                <Script
                    id="ft-font-bootstrap"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{ __html: FONT_BOOTSTRAP_SCRIPT }}
                />
            </head>
            <body className="antialiased">
                <AuthSessionProvider>
                    <I18nProvider initialLocale={initialLocale}>
                        <AppSettingsProvider
                            initialTheme={initialTheme}
                            initialFont={initialAppFont}
                        >
                            <UniverseProvider initialUniverse={initialUniverse}>
                                <MarketProvider>
                                    {requiresTwoFactorGate ? (
                                        <TwoFactorLoginGate />
                                    ) : (
                                        children
                                    )}
                                </MarketProvider>
                            </UniverseProvider>
                        </AppSettingsProvider>
                    </I18nProvider>
                </AuthSessionProvider>
            </body>
        </html>
    );
}
