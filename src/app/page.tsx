"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MainChart } from "../components/MainChart";
import { RightPanel } from "../components/RightPanel";
import { LeftSidebar } from "../components/LeftSidebar";
import { OrderBook } from "../components/OrderBook";
import { TickerBar } from "../components/TickerBar";
import { AppTopBar } from "../components/shell/AppTopBar";
import { useI18n } from "../context/I18nContext";

const BOTTOM_MIN = 100;
const BOTTOM_MAX = 460;
const BOTTOM_DEFAULT = 240;

export default function App() {
    const { t } = useI18n();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [bottomHeight, setBottomHeight] = useState(BOTTOM_DEFAULT);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // ── Vertical resize for bottom pane ──────────────────────────────────────
    const isDraggingBottom = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(BOTTOM_DEFAULT);

    const onBottomHandleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            isDraggingBottom.current = true;
            startY.current = e.clientY;
            startHeight.current = bottomHeight;
            document.body.style.cursor = "row-resize";
            document.body.style.userSelect = "none";
            e.preventDefault();
        },
        [bottomHeight],
    );

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDraggingBottom.current) return;
            // Dragging up = bigger bottom pane (negative delta from start)
            const delta = startY.current - e.clientY;
            setBottomHeight(
                Math.min(
                    BOTTOM_MAX,
                    Math.max(BOTTOM_MIN, startHeight.current + delta),
                ),
            );
        };
        const onUp = () => {
            if (!isDraggingBottom.current) return;
            isDraggingBottom.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
    }, []);

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            <AppTopBar
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                refreshTitle={t("common.refresh")}
                refreshAriaLabel={t("common.refresh")}
            />

            {/* ── Main Layout ── */}
            <div className="flex-1 flex min-h-0">
                {/* Left Sidebar */}
                <LeftSidebar />

                {/* Center: Chart + Order Book */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Price Chart — takes remaining height */}
                    <div className="flex-1 min-h-0">
                        <MainChart />
                    </div>

                    {/* ── Vertical resize handle ── */}
                    <div
                        onMouseDown={onBottomHandleMouseDown}
                        className="h-1.5 shrink-0 cursor-row-resize bg-transparent hover:bg-accent/25 active:bg-accent/40 transition-colors group relative"
                        title="Drag to resize order book"
                    >
                        {/* Visual grip indicator */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                            <div className="w-12 h-0.5 rounded-full bg-main border border-main group-hover:bg-accent/50 transition-colors" />
                        </div>
                    </div>

                    {/* Order Book — resizable height */}
                    <div className="shrink-0" style={{ height: bottomHeight }}>
                        <OrderBook />
                    </div>
                </div>

                {/* Right Panel: AI Analysis (horizontally resizable) */}
                <RightPanel />
            </div>

            {/* ── Bottom Ticker Bar ── */}
            <TickerBar />
        </div>
    );
}
