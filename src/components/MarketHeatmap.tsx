"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useAppSettings } from "../context/AppSettingsContext";
import { Asset } from "../services/binanceService";

export function MarketHeatmap({
    className,
}: {
    assets?: Asset[];
    limit?: number;
    onCoinClick?: (symbolId: string) => void;
    className?: string;
}) {
    const { theme } = useAppSettings();
    const containerRef = useRef<HTMLDivElement>(null);

    const colorTheme = useMemo<"light" | "dark">(
        () => (theme === "light" ? "light" : "dark"),
        [theme],
    );

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.innerHTML = "";

        const widget = document.createElement("div");
        widget.className = "tradingview-widget-container__widget h-full";

        const credits = document.createElement("div");
        credits.className = "tradingview-widget-copyright text-[10px] mt-2 text-muted";
        credits.innerHTML =
            '<a href="https://www.tradingview.com/markets/cryptocurrencies/prices-all/" rel="noopener noreferrer" target="_blank" class="hover:text-main transition-colors"><span class="blue-text">Crypto heatmap by TradingView</span></a>';

        const script = document.createElement("script");
        script.src =
            "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js";
        script.type = "text/javascript";
        script.async = true;
        script.text = JSON.stringify({
            dataSource: "Crypto",
            blockSize: "market_cap_calc",
            blockColor: "change",
            locale: "en",
            symbolUrl: "/",
            colorTheme,
            hasTopBar: false,
            isDataSetEnabled: false,
            isZoomEnabled: true,
            hasSymbolTooltip: true,
            isMonoSize: false,
            width: "100%",
            height: "100%",
        });

        container.appendChild(widget);
        container.appendChild(script);
        container.appendChild(credits);

        return () => {
            container.innerHTML = "";
        };
    }, [colorTheme]);

    return (
        <div
            className={`tradingview-widget-container w-full h-full ${className ?? ""}`}
            ref={containerRef}
        />
    );
}
