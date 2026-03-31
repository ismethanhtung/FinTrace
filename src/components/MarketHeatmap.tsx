"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useAppSettings } from "../context/AppSettingsContext";
import { Asset } from "../services/binanceService";
import { useUniverse } from "../context/UniverseContext";

export function MarketHeatmap({
    className,
}: {
    assets?: Asset[];
    limit?: number;
    onCoinClick?: (symbolId: string) => void;
    className?: string;
}) {
    const { theme } = useAppSettings();
    const { universe } = useUniverse();
    const containerRef = useRef<HTMLDivElement>(null);

    const colorTheme = useMemo<"light" | "dark">(
        () => (theme === "light" ? "light" : "dark"),
        [theme],
    );

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        if (universe === "stock") {
            container.innerHTML = "";
            return;
        }

        container.innerHTML = "";

        const widget = document.createElement("div");
        widget.className = "tradingview-widget-container__widget h-full";

        const credits = document.createElement("div");
        credits.className =
            "tradingview-widget-copyright text-[10px] mt-2 text-muted";

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
    }, [colorTheme, universe]);

    if (universe === "stock") {
        return (
            <div
                className={`w-full h-full ${className ?? ""} flex items-center justify-center bg-secondary/20 border border-main`}
            >
                <div className="text-center space-y-2">
                    <div className="text-[12px] font-semibold uppercase tracking-wider text-amber-400">
                        Stock Heatmap
                    </div>
                    <p className="text-[12px] text-muted">
                        Stock heatmap sẽ được nối dữ liệu thật ở phase tiếp theo.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`tradingview-widget-container w-full h-full ${className ?? ""}`}
            ref={containerRef}
        />
    );
}
