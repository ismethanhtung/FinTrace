"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { AnimatePresence, motion } from "motion/react";

export function QuestionTooltip({
    text,
    className,
}: {
    text: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    const computePos = () => {
        const btn = buttonRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const tooltipWidth = 320;
        const tooltipHeightEstimate = 160;
        const viewportPadding = 12;

        const centerX = rect.left + rect.width / 2;
        let left = centerX - tooltipWidth / 2;
        left = Math.max(viewportPadding, left);
        left = Math.min(left, window.innerWidth - tooltipWidth - viewportPadding);

        let top = rect.bottom + 10;
        if (top + tooltipHeightEstimate > window.innerHeight - viewportPadding) {
            top = Math.max(viewportPadding, rect.top - tooltipHeightEstimate - 10);
        }

        setTooltipPos({ top, left });
    };

    useEffect(() => {
        if (!open) return;
        computePos();

        const onResize = () => computePos();
        const onScroll = () => computePos();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        const onPointerDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (buttonRef.current?.contains(target)) return;
            if (tooltipRef.current?.contains(target)) return;
            setOpen(false);
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
    }, [open]);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                aria-label={text}
                aria-expanded={open}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                className={cn(
                    "inline-flex items-center justify-center w-4 h-4 rounded-full border border-main text-muted select-none cursor-help",
                    "text-[10px] font-bold leading-none hover:text-main transition-colors",
                    className,
                )}
            >
                ?
            </button>

            {open &&
                createPortal(
                    <AnimatePresence>
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
                                width: 320,
                            }}
                            className={cn(
                                "z-[120] p-3.5",
                                "bg-main/95 backdrop-blur-sm",
                                "border border-main rounded-xl shadow-2xl",
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-[11px] text-muted leading-relaxed">
                                {text}
                            </div>
                        </motion.div>
                    </AnimatePresence>,
                    document.body,
                )}
        </>
    );
}

