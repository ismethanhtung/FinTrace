"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    ExternalLink,
    Loader2,
    Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useAppSettings } from "../../context/AppSettingsContext";
import { aiProviderService } from "../../services/aiProviderService";
import { cn } from "../../lib/utils";
import { useI18n } from "../../context/I18nContext";

export type NewsPageSummaryArticle = {
    id: string;
    title: string;
    url: string;
    source: string;
    relativeTime: string;
    description?: string;
};

const SUMMARY_SYSTEM_PROMPT_VI =
    "Bạn là chuyên gia phân tích tài chính AI. Nhiệm vụ của bạn là đọc tin tức, sau đó trả về chuẩn xác theo định dạng Markdown tiếng Việt thật ngắn gọn:\n1. 2-3 gạch đầu dòng tóm tắt ý chính.\n2. Cuối cùng, bắt buộc kết luận bằng dòng chữ:\n\n**Đánh giá:** [Tích cực / Tiêu cực / Bình thường / Không liên quan / Giật tít rẻ tiền] - (1 câu giải thích ngắn).";

const SUMMARY_SYSTEM_PROMPT_EN =
    "You are an AI financial analyst. Read the news and return a concise English Markdown output:\n1. 2-3 bullet points of key takeaways.\n2. End with:\n\n**Verdict:** [Positive / Negative / Neutral / Not relevant / Clickbait] - (one short explanation sentence).";

function hostFromUrl(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}

export function NewsPageAiSummaryTooltip({
    article,
    className,
    buttonClassName,
}: {
    article: NewsPageSummaryArticle;
    /** Wrapper for layout (e.g. shrink-0) */
    className?: string;
    /** Override trigger button look */
    buttonClassName?: string;
}) {
    const { t, locale } = useI18n();
    const { activeProviderId, activeProvider, selectedModel } = useAppSettings();
    const [showSummary, setShowSummary] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const [summary, setSummary] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    const updateTooltipPosition = () => {
        const btn = buttonRef.current;
        if (!btn) return;

        const rect = btn.getBoundingClientRect();
        const tooltipWidth = Math.min(380, window.innerWidth - 24);
        const tooltipHeightEstimate = 280;
        const padding = 12;

        const centerX = rect.left + rect.width / 2;
        let left = centerX - tooltipWidth / 2;
        left = Math.max(padding, left);
        left = Math.min(left, window.innerWidth - tooltipWidth - padding);

        let top = rect.bottom + 10;
        if (
            top + tooltipHeightEstimate >
            window.innerHeight - padding
        ) {
            top = Math.max(padding, rect.top - tooltipHeightEstimate - 10);
        }

        setTooltipPos({ top, left });
    };

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const loadSummary = async () => {
        if (summary || isSummarizing) return;

        // Important: do NOT block on missing user API key.
        // Server proxy routes (`src/app/api/*/chat/completions`) already
        // fallback to system/injected keys when the client omits x-* headers.
        const apiKey = activeProvider?.apiKey ?? "";

        setIsSummarizing(true);
        setError(null);
        try {
            const text = await aiProviderService.chat(
                activeProviderId,
                apiKey,
                activeProvider?.baseUrl,
                selectedModel,
                [
                    {
                        role: "system",
                        content:
                            locale === "vi"
                                ? SUMMARY_SYSTEM_PROMPT_VI
                                : SUMMARY_SYSTEM_PROMPT_EN,
                    },
                    {
                        role: "user",
                        content: `Title: ${article.title}\nContent: ${article.description || t("newsTooltip.noExtraContent")}`,
                    },
                ],
            );
            setSummary(text || t("newsTooltip.noSummary"));
        } catch (err) {
            setError(err instanceof Error ? err.message : t("newsTooltip.summaryError"));
        } finally {
            setIsSummarizing(false);
        }
    };

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

    const toggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!showSummary) {
            updateTooltipPosition();
            setShowSummary(true);
            void loadSummary();
        } else {
            setShowSummary(false);
        }
    };

    const tooltipWidth = typeof window !== "undefined"
        ? Math.min(380, window.innerWidth - 24)
        : 380;

    return (
        <div className={cn("relative inline-flex shrink-0", className)}>
            <button
                ref={buttonRef}
                type="button"
                onClick={toggle}
                title={t("newsTooltip.aiSummary")}
                aria-label={t("newsTooltip.openAiSummary")}
                className={cn(
                    "p-1 rounded border border-black/25 bg-white/60 hover:bg-black hover:text-white transition-colors",
                    "news-font-mono",
                    showSummary && "bg-black text-white border-black",
                    buttonClassName,
                )}
            >
                {isSummarizing ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <Sparkles size={12} />
                )}
            </button>

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
                                    width: tooltipWidth,
                                }}
                                className={cn(
                                    "z-[200] p-4 max-h-[min(70vh,440px)] overflow-y-auto",
                                    "bg-[#f4f1ea] text-[#1a1a1a] border-2 border-black",
                                    "shadow-[6px_6px_0_#1a1a1a]",
                                )}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2 border-b border-black/15 pb-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-600/90 news-font-mono">
                                            {t("newsTooltip.aiSummary")} · {article.source}
                                        </p>
                                        <p className="text-[9px] text-gray-500 news-font-mono mt-0.5">
                                            {article.relativeTime} · {hostFromUrl(article.url)}
                                        </p>
                                    </div>
                                    <a
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 p-1.5 border border-black/20 hover:bg-black hover:text-white transition-colors rounded"
                                        title={t("newsTooltip.readOriginal")}
                                    >
                                        <ExternalLink size={12} />
                                    </a>
                                </div>

                                <p className="text-[11px] font-bold leading-snug mb-3">
                                    {article.title}
                                </p>

                                {error && (
                                    <div className="text-rose-800 text-[11px] leading-relaxed mb-2 p-2 border border-rose-800/30 bg-rose-50/80">
                                        {error}
                                        {error.includes("API key") && (
                                            <>
                                                {" "}
                                                <Link
                                                    href="/settings"
                                                    className="underline font-semibold"
                                                >
                                                    {t("newsTooltip.openSettings")}
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                )}

                                {isSummarizing && !summary && !error && (
                                    <div className="flex items-center gap-2 text-[11px] text-gray-600 news-font-mono py-2">
                                        <Loader2
                                            size={14}
                                            className="animate-spin shrink-0"
                                        />
                                        {t("newsTooltip.summarizing")}
                                    </div>
                                )}

                                {summary && (
                                    <div
                                        className={cn(
                                            "prose prose-sm max-w-none text-[11px] leading-relaxed",
                                            "prose-p:my-1 prose-ul:my-1 prose-li:my-0.5",
                                            "marker:text-black prose-headings:text-[#1a1a1a]",
                                        )}
                                    >
                                        <ReactMarkdown>{summary}</ReactMarkdown>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body,
                )}
        </div>
    );
}
