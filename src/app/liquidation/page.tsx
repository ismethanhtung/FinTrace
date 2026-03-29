"use client";

import React, { useState } from "react";
import {
    AlertTriangle,
} from "lucide-react";
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

            <main className="flex-1 min-h-0 flex flex-col overflow-hidden p-6 sm:p-8 mx-auto w-full max-w-[1600px]">
                <div className="flex min-h-0 flex-1 w-full rounded-xl border border-main overflow-hidden bg-main">
                    <LeftSidebar embedded />

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-main">
                        <div className="px-4 py-3 border-b border-main bg-secondary/10 shrink-0">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-amber-500 font-bold">
                                <AlertTriangle size={14} />
                                Dedicated Liquidation Stream
                            </div>
                            <div className="mt-1 text-[12px] text-muted">
                                Theo doi liquidation futures trong mot trang
                                rieng, nhung van giu nguyen tab Liquidation o
                                trang chu.
                            </div>
                        </div>

                        <div className="flex-1 min-h-0">
                            <FuturesLiquidationPanel key={panelKey} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
