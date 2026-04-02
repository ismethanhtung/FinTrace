"use client";

import React, { useEffect, useRef } from "react";
import { useAppSettings } from "../context/AppSettingsContext";
import { useUniverse } from "../context/UniverseContext";

export function MarketHeatmap({ className }: { className?: string }) {
    const { theme } = useAppSettings();
    const { universe } = useUniverse();

    // Dùng key để React tự động đập đi xây lại toàn bộ component khi universe hoặc theme đổi
    // Điều này đảm bảo useEffect cũ bị dọn sạch và script mới được tải lại từ đầu
    const componentKey = `${universe}-${theme}`;

    return (
        <HeatmapInner
            key={componentKey}
            universe={universe}
            theme={theme}
            className={className}
        />
    );
}

function HeatmapInner({ universe, theme, className }: any) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const isStock = universe === "stock";
        const scriptSrc = isStock
            ? "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js"
            : "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js";

        const config = isStock
            ? {
                  exchanges: [],
                  dataSource: "AllVN",
                  grouping: "sector",
                  blockSize: "market_cap_basic",
                  blockColor: "change",
                  locale: "vi_VN",
                  symbolUrl: "",
                  colorTheme: theme,
                  hasTopBar: true,
                  isDataSetEnabled: true,
                  isZoomEnabled: true,
                  hasSymbolTooltip: true,
                  width: "100%",
                  height: "100%",
              }
            : {
                  dataSource: "Crypto",
                  blockSize: "market_cap_calc",
                  blockColor: "change",
                  locale: "en",
                  symbolUrl: "",
                  colorTheme: theme,
                  hasTopBar: true,
                  isDataSetEnabled: false,
                  isZoomEnabled: true,
                  hasSymbolTooltip: true,
                  width: "100%",
                  height: "100%",
              };

        // Tạo script tag bằng phương pháp thủ công
        const script = document.createElement("script");
        script.src = scriptSrc;
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = JSON.stringify(config);

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
        };
    }, [universe, theme]);

    return (
        <div className={`w-full h-full min-h-[600px] ${className ?? ""}`}>
            <div
                className="tradingview-widget-container"
                style={{ height: "100%", width: "100%" }}
            >
                <div
                    ref={containerRef}
                    className="tradingview-widget-container__widget"
                    style={{ height: "100%", width: "100%" }}
                ></div>
            </div>
        </div>
    );
}
