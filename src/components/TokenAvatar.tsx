"use client";

import React, { useState } from "react";
import { cn } from "../lib/utils";

type TokenAvatarProps = {
    symbol: string;
    logoUrl?: string | null;
    size?: number;
    className?: string;
    /** Accent ring / letter when selected */
    selected?: boolean;
};

/**
 * Avatar token: ưu tiên ảnh từ `logoUrl`, lỗi tải thì fallback chữ cái đầu.
 */
export function TokenAvatar({
    symbol,
    logoUrl,
    size = 28,
    className,
    selected,
}: TokenAvatarProps) {
    const [imgFailed, setImgFailed] = useState(false);
    const letter = symbol?.[0]?.toUpperCase() ?? "?";
    const showImg = Boolean(logoUrl) && !imgFailed;

    return (
        <div
            className={cn(
                "rounded-full flex items-center justify-center shrink-0 overflow-hidden font-bold bg-secondary text-muted",
                selected && !showImg && "bg-accent text-white",
                selected && showImg && "ring-2 ring-accent/40",
                className,
            )}
            style={{
                width: size,
                height: size,
                fontSize: Math.max(10, size * 0.38),
            }}
        >
            {showImg ? (
                <img
                    src={logoUrl!}
                    alt=""
                    width={size}
                    height={size}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={() => setImgFailed(true)}
                />
            ) : (
                <span>{letter}</span>
            )}
        </div>
    );
}
