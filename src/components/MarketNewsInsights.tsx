"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Sparkles,
    ExternalLink,
    RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { createPortal } from "react-dom";
import { useMarketNews } from "../hooks/useMarketNews";
import type { MarketNewsArticle } from "../hooks/useMarketNews";
import { cn } from "../lib/utils";
import { useAppSettings } from "../context/AppSettingsContext";

// ─── Single Article Pill ──────────────────────────────────────────────────────

const ArticlePill = ({ article }: { article: MarketNewsArticle }) => {
    const [showSummary, setShowSummary] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    const SentimentIcon =
        article.sentiment === "positive"
            ? TrendingUp
            : article.sentiment === "negative"
              ? TrendingDown
              : Minus;

    const sentimentColor =
        article.sentiment === "positive"
            ? "text-emerald-500"
            : article.sentiment === "negative"
              ? "text-rose-500"
              : "text-muted";

    const sentimentBg =
        article.sentiment === "positive"
            ? "bg-emerald-500/10"
            : article.sentiment === "negative"
              ? "bg-rose-500/10"
              : "bg-secondary";

    const updateTooltipPosition = () => {
        const btn = buttonRef.current;
        if (!btn) return;

        const rect = btn.getBoundingClientRect();
        const tooltipWidth = 360;
        const tooltipHeightEstimate = 250;
        const viewportPadding = 12;

        const centerX = rect.left + rect.width / 2;
        let left = centerX - tooltipWidth / 2;
        left = Math.max(viewportPadding, left);
        left = Math.min(
            left,
            window.innerWidth - tooltipWidth - viewportPadding,
        );

        let top = rect.bottom + 10;
        if (
            top + tooltipHeightEstimate >
            window.innerHeight - viewportPadding
        ) {
            top = Math.max(
                viewportPadding,
                rect.top - tooltipHeightEstimate - 10,
            );
        }

        setTooltipPos({ top, left });
    };

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!showSummary) return;

        updateTooltipPosition();

        const onResize = () => updateTooltipPosition();
        const onScroll = () => updateTooltipPosition();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setShowSummary(false);
        };
        const onPointerDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (buttonRef.current?.contains(target)) return;
            if (tooltipRef.current?.contains(target)) return;
            setShowSummary(false);
        };

        window.addEventListener("resize", onResize);
        window.addEventListener("scroll", onScroll, true);
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("mousedown", onPointerDown);

        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("scroll", onScroll, true);
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("mousedown", onPointerDown);
        };
    }, [showSummary]);

    return (
        <div className="relative group">
            <div
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-transparent",
                    "hover:border-main hover:bg-secondary transition-all cursor-pointer",
                )}
            >
                {/* Sentiment icon */}
                <span className={cn("shrink-0", sentimentColor)}>
                    <SentimentIcon size={14} />
                </span>

                {/* Clickable title → open article */}
                <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-muted hover:text-main transition-colors whitespace-nowrap max-w-[220px] truncate hover:underline"
                    title={article.originalTitle}
                    onClick={(e) => e.stopPropagation()}
                >
                    {article.shortTitle}
                </a>

                {/* AI Summary toggle */}
                <button
                    ref={buttonRef}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!showSummary) updateTooltipPosition();
                        setShowSummary((v) => !v);
                    }}
                    className={cn(
                        "shrink-0 p-1 rounded-md transition-all border",
                        showSummary
                            ? "text-accent bg-accent/10 border-accent/30"
                            : "text-muted hover:text-accent border-transparent hover:border-main hover:bg-secondary",
                    )}
                    title="AI Summary"
                    aria-label="Toggle AI summary"
                >
                    <Sparkles size={12} />
                </button>
            </div>

            {/* Summary Tooltip (floating portal) */}
            {isMounted &&
                createPortal(
                    <AnimatePresence>
                        {showSummary && (
                            <motion.div
                                ref={tooltipRef}
                                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                transition={{ duration: 0.16 }}
                                style={{
                                    position: "fixed",
                                    top: tooltipPos.top,
                                    left: tooltipPos.left,
                                    width: 360,
                                }}
                                className={cn(
                                    "z-[120] p-3.5",
                                    "bg-main/95 backdrop-blur-sm border border-main rounded-xl shadow-2xl",
                                )}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={cn(
                                                "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                                                sentimentBg,
                                                sentimentColor,
                                            )}
                                        >
                                            <SentimentIcon size={10} />
                                            {article.sentiment === "positive"
                                                ? "Tích cực"
                                                : article.sentiment ===
                                                    "negative"
                                                  ? "Tiêu cực"
                                                  : "Trung lập"}
                                        </span>
                                        <span className="text-[9px] text-muted">
                                            {article.relativeTime}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {/* Nút đọc bài gốc */}
                                        <a
                                            href={article.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-muted hover:text-accent transition-colors"
                                            title="Đọc bài gốc"
                                        >
                                            <ExternalLink size={11} />
                                        </a>
                                        {/* Thêm nguồn và trang đăng bài */}
                                        {article.source && (
                                            <span className="ml-2 text-[9px] text-muted font-medium">
                                                Nguồn: {article.source}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Title */}
                                <p className="text-[11px] font-semibold text-main leading-snug mb-2.5">
                                    {article.originalTitle}
                                </p>

                                {/* Nếu có trang đăng bài (domain), hiển thị ở đây */}
                                {article.url && (
                                    <p className="text-[9px] text-muted mb-2">
                                        Trang đăng:{" "}
                                        <span className="underline">
                                            {(() => {
                                                try {
                                                    const urlObj = new URL(
                                                        article.url,
                                                    );
                                                    return urlObj.hostname.replace(
                                                        /^www\./,
                                                        "",
                                                    );
                                                } catch {
                                                    return article.url;
                                                }
                                            })()}
                                        </span>
                                    </p>
                                )}

                                {/* Summary */}
                                <div className="prose prose-invert prose-p:my-0 prose-ul:my-0.5 prose-li:my-0 max-w-none text-[11px] leading-relaxed text-main/80 marker:text-accent">
                                    <ReactMarkdown>
                                        {article.summary}
                                    </ReactMarkdown>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body,
                )}
        </div>
    );
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

const SkeletonPill = () => (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md">
        <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
        <div className="h-2.5 w-36 rounded bg-secondary animate-pulse" />
        <div className="h-2 w-10 rounded bg-secondary animate-pulse" />
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const MarketNewsInsights = () => {
    const { aiProviders } = useAppSettings();
    const groqProviderKey =
        aiProviders.find((provider) => provider.id === "groq")?.apiKey ?? "";

    const { articles, isLoading, error, refetch } = useMarketNews({
        userGroqApiKey: groqProviderKey,
    });

    return (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {isLoading && articles.length === 0 ? (
                <>
                    <SkeletonPill />
                    <SkeletonPill />
                    <SkeletonPill />
                </>
            ) : error ? (
                <button
                    onClick={() => refetch(true)}
                    className="flex items-center gap-1.5 text-[11px] text-rose-500 hover:text-rose-400 transition-colors px-2 py-1"
                >
                    <RefreshCw size={11} />
                    <span>Lỗi tải tin tức – Thử lại</span>
                </button>
            ) : (
                <>
                    {articles.map((art) => (
                        <ArticlePill key={art.id} article={art} />
                    ))}

                    {/* Divider */}
                    {articles.length > 0 && (
                        <div className="h-4 w-px border-l border-main mx-1 shrink-0" />
                    )}

                    {/* Refresh button */}
                    <button
                        onClick={() => refetch(true)}
                        disabled={isLoading}
                        className={cn(
                            "p-1.5 rounded-md text-muted hover:text-main hover:bg-secondary transition-colors shrink-0",
                            isLoading && "animate-spin",
                        )}
                        title="Refresh news"
                    >
                        <RefreshCw size={11} />
                    </button>

                    {/* More → future news page */}
                    <a
                        href="/news"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] text-muted hover:text-main hover:bg-secondary border border-transparent hover:border-main transition-all whitespace-nowrap shrink-0 hover:underline cursor-pointer"
                    >
                        <span>More</span>
                    </a>
                </>
            )}
        </div>
    );
};
