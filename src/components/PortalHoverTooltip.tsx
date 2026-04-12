"use client";

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import { createPortal } from "react-dom";

/**
 * Same portal tooltip styling as the Info (i) control in the left sidebar.
 * When `enabled` is false, renders `children` only (no wrapper span).
 */
export function PortalHoverTooltip({
    text,
    enabled,
    children,
}: {
    text: string;
    enabled: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [tooltipPos, setTooltipPos] = useState<{
        top: number;
        left: number;
    } | null>(null);
    const triggerRef = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const computePos = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return null;

        const rect = trigger.getBoundingClientRect();
        const width = 240;
        const viewportPadding = 10;

        let left = rect.right + 10;
        if (left + width > window.innerWidth - viewportPadding) {
            left = Math.max(viewportPadding, rect.left - width - 10);
        }

        const top = Math.min(
            Math.max(viewportPadding, rect.top + rect.height / 2),
            window.innerHeight - viewportPadding,
        );

        return { top, left };
    }, []);

    const openTooltip = useCallback(() => {
        const nextPos = computePos();
        if (nextPos) setTooltipPos(nextPos);
        setOpen(true);
    }, [computePos]);

    const closeTooltip = useCallback(() => {
        setOpen(false);
        setTooltipPos(null);
    }, []);

    useEffect(() => {
        if (!open) return;
        const syncPos = () => {
            const nextPos = computePos();
            if (nextPos) setTooltipPos(nextPos);
        };

        syncPos();
        window.addEventListener("resize", syncPos);
        window.addEventListener("scroll", syncPos, true);
        return () => {
            window.removeEventListener("resize", syncPos);
            window.removeEventListener("scroll", syncPos, true);
        };
    }, [computePos, open]);

    if (!enabled) {
        return <>{children}</>;
    }

    return (
        <>
            <span
                ref={triggerRef}
                className="inline-flex items-center"
                onMouseEnter={openTooltip}
                onMouseLeave={closeTooltip}
                onFocusCapture={openTooltip}
                onBlurCapture={closeTooltip}
            >
                {children}
            </span>
            {mounted &&
                open &&
                tooltipPos &&
                createPortal(
                    <div
                        className="pointer-events-none fixed z-[9999] w-60 -translate-y-1/2 whitespace-pre-line rounded-md border border-main bg-main p-2 text-[9px] leading-relaxed text-muted shadow-2xl"
                        style={{
                            top: tooltipPos.top,
                            left: tooltipPos.left,
                        }}
                    >
                        {text}
                    </div>,
                    document.body,
                )}
        </>
    );
}
