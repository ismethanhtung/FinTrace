"use client";

import React, { useState } from "react";
import { LeftSidebar } from "../../components/LeftSidebar";
import { FuturesLiquidationPanel } from "../../components/FuturesLiquidationPanel";
import { AppTopBar } from "../../components/shell/AppTopBar";

export default function LiquidationPage() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [panelKey, setPanelKey] = useState(0);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setPanelKey((prev) => prev + 1);
        setTimeout(() => setIsRefreshing(false), 800);
    };

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            <AppTopBar
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                refreshTitle="Reload liquidation stream"
                refreshAriaLabel="Reload liquidation stream"
            />

            <main className="flex-1 min-h-0 flex overflow-hidden">
                <div className="flex min-h-0 flex-1 w-full overflow-hidden bg-main">
                    <LeftSidebar embedded />

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-main">
                        <FuturesLiquidationPanel
                            key={panelKey}
                            standalone
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
