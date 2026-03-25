import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { MarketProvider } from "../context/MarketContext";
import { AppSettingsProvider } from "../context/AppSettingsContext";
import { FaroClient } from "../components/FaroClient";

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});

export const metadata: Metadata = {
    title: "FinTrace - Real-time Financial Analysis",
    description: "Advanced financial tracking and AI-driven analysis",
    icons: {
        icon: "/favicon.svg",
        shortcut: "/favicon.svg",
        apple: "/favicon.svg",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${jetbrainsMono.variable} antialiased`}>
                <AppSettingsProvider>
                    <MarketProvider>
                        <FaroClient />
                        {children}
                    </MarketProvider>
                </AppSettingsProvider>
            </body>
        </html>
    );
}
