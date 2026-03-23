import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { MarketProvider } from "../context/MarketContext";
import { AppSettingsProvider } from "../context/AppSettingsContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "FinTrace - Real-time Financial Analysis",
  description: "Advanced financial tracking and AI-driven analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <AppSettingsProvider>
          <MarketProvider>
            {children}
          </MarketProvider>
        </AppSettingsProvider>
      </body>
    </html>
  );
}
