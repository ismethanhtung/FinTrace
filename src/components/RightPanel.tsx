"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { MessageSquare, Rss, FileText } from "lucide-react";
import { cn } from "../lib/utils";
import { ChatPanel } from "./ai/ChatPanel";
import { NewsPanel } from "./ai/NewsPanel";
import { SummaryPanel } from "./ai/SummaryPanel";
import { useI18n } from "../context/I18nContext";

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 340;

type Tab = "chat" | "news" | "summary";

export const RightPanel = () => {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<Tab>("chat");
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(DEFAULT_WIDTH);

    const onMouseDown = useCallback(
        (e: React.MouseEvent) => {
            isDragging.current = true;
            startX.current = e.clientX;
            startWidth.current = width;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            e.preventDefault();
        },
        [width],
    );

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const delta = startX.current - e.clientX;
            const next = Math.min(
                MAX_WIDTH,
                Math.max(MIN_WIDTH, startWidth.current + delta),
            );
            setWidth(next);
        };
        const onUp = () => {
            if (!isDragging.current) return;
            isDragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, []);

    const TABS = [
        { id: "chat", label: t("rightPanel.aiChat"), icon: MessageSquare },
        { id: "news", label: t("navigation.news"), icon: Rss },
        { id: "summary", label: t("rightPanel.summary"), icon: FileText },
    ];

    return (
        <div
            className="h-full flex flex-col bg-main border-l border-main relative shrink-0"
            style={{ width }}
        >
            {/* ── Left-edge resize handle ── */}
            <div
                onMouseDown={onMouseDown}
                className="absolute left-0 top-0 w-1.5 h-full z-30 cursor-col-resize hover:bg-accent/20 transition-colors"
            />

            {/* ── Tabs ── */}
            <div className="shrink-0 border-b border-main bg-main px-2 py-1">
                <div className="flex items-center gap-1 ">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={cn(
                                    "flex-1 h-7 rounded px-2.5 text-[11px] font-semibold transition-all",
                                    "flex items-center justify-center gap-1.5",
                                    isActive
                                        ? "bg-secondary text-main"
                                        : "text-muted hover:text-main  ",
                                )}
                            >
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Content Area ── */}
            <div className="flex-1 min-h-0 relative z-10 bg-main flex flex-col">
                <div
                    className={cn(
                        "h-full min-h-0 flex-col",
                        activeTab === "chat" ? "flex" : "hidden",
                    )}
                >
                    <ChatPanel />
                </div>
                <div
                    className={cn(
                        "h-full min-h-0 flex-col",
                        activeTab === "news" ? "flex" : "hidden",
                    )}
                >
                    <NewsPanel />
                </div>
                <div
                    className={cn(
                        "h-full min-h-0 flex-col",
                        activeTab === "summary" ? "flex" : "hidden",
                    )}
                >
                    <SummaryPanel />
                </div>
            </div>
        </div>
    );
};
