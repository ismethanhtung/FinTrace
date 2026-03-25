"use client";

import React from "react";
import { cn } from "../../lib/utils";

export function QuestionTooltip({
    text,
    className,
}: {
    text: string;
    className?: string;
}) {
    return (
        <span
            title={text}
            aria-label={text}
            className={cn(
                "inline-flex items-center justify-center w-4 h-4 rounded-full border border-main text-muted select-none cursor-help",
                "text-[10px] font-bold leading-none",
                className,
            )}
        >
            ?
        </span>
    );
}

