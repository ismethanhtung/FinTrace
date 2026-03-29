"use client";

import React from "react";
import { MarketHeatmap } from "../../components/MarketHeatmap";
import { TickerBar } from "../../components/TickerBar";
import { AppTopBar } from "../../components/shell/AppTopBar";

export default function HeatmapPage() {
    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            <AppTopBar />

            <main className="flex-1 min-h-0">
                <MarketHeatmap className="h-full w-full" />
            </main>

            <TickerBar />
        </div>
    );
}
