"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "../lib/utils";
import {
    ArrowUpRight,
    ArrowDownRight,
    List,
    ChevronDown,
    Search,
    Clock,
    Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMarket } from "../context/MarketContext";
import { Asset } from "../services/binanceService";
import { TokenAvatar } from "./TokenAvatar";

const RECENTS_KEY = "fintrace_recent_symbols";
const MAX_RECENTS = 5;

const usdFmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function priceFmt(price: number) {
    return price < 1 ? price.toFixed(4) : usdFmt.format(price);
}

function loadRecents(): string[] {
    try {
        const raw = localStorage.getItem(RECENTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveRecents(symbols: string[]) {
    try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(symbols));
    } catch {
        // localStorage unavailable (SSR / private mode)
    }
}

// ─── Single asset row ─────────────────────────────────────────────────────────
const AssetRow = ({
    asset,
    isSelected,
    onClick,
    badge,
}: {
    asset: Asset;
    isSelected: boolean;
    onClick: () => void;
    badge?: React.ReactNode;
}) => (
    <div
        onClick={onClick}
        className={cn(
            "px-4 py-2.5 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer group border-b border-main last:border-0",
            isSelected && "bg-accent/5",
        )}
    >
        <div className="flex items-center space-x-3">
            <TokenAvatar
                symbol={asset.symbol}
                logoUrl={asset.logoUrl}
                size={28}
                selected={isSelected}
            />
            <div>
                <div className="flex items-center space-x-1.5">
                    <span
                        className={cn(
                            "text-[12px] font-semibold",
                            isSelected && "text-accent",
                        )}
                    >
                        {asset.symbol}
                    </span>
                    {badge}
                </div>
                <div className="text-[10px] text-muted">Binance</div>
            </div>
        </div>
        <div className="text-right">
            <div className="text-[12px] font-mono font-medium">
                ${priceFmt(asset.price)}
            </div>
            <div
                className={cn(
                    "text-[9px] mt-0.5 flex items-center justify-end font-semibold",
                    asset.changePercent >= 0
                        ? "text-emerald-500"
                        : "text-rose-500",
                )}
            >
                {asset.changePercent >= 0 ? (
                    <ArrowUpRight size={10} className="mr-0.5" />
                ) : (
                    <ArrowDownRight size={10} className="mr-0.5" />
                )}
                {Math.abs(asset.changePercent).toFixed(2)}%
            </div>
        </div>
    </div>
);

// ─── WatchlistDropdown ────────────────────────────────────────────────────────
export const WatchlistDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const [recents, setRecents] = useState<string[]>([]);
    const { assets, selectedSymbol, setSelectedSymbol } = useMarket();

    // Load recents from localStorage on mount
    useEffect(() => {
        setRecents(loadRecents());
    }, []);

    // "/" opens Market (skip when typing in inputs / chat / contenteditable)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "/" || e.repeat) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target;
            if (
                t instanceof HTMLElement &&
                (t.closest(
                    'input, textarea, select, [contenteditable="true"]',
                ) ||
                    t.isContentEditable)
            ) {
                return;
            }
            e.preventDefault();
            setIsOpen(true);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const handleSelect = useCallback(
        (id: string) => {
            setSelectedSymbol(id);
            setIsOpen(false);
            setFilter("");
            // Push to recents
            setRecents((prev) => {
                const next = [id, ...prev.filter((s) => s !== id)].slice(
                    0,
                    MAX_RECENTS,
                );
                saveRecents(next);
                return next;
            });
        },
        [setSelectedSymbol],
    );

    const filteredAssets = assets.filter(
        (a) =>
            a.symbol.toLowerCase().includes(filter.toLowerCase()) ||
            a.id.toLowerCase().includes(filter.toLowerCase()),
    );

    // Top 5 gainers for "Trending" section
    const trending = [...assets]
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 5);

    // Recent asset objects
    const recentAssets = recents
        .map((id) => assets.find((a) => a.id === id))
        .filter(Boolean) as Asset[];

    const hasQuery = filter.trim().length > 0;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                title="Mở Market — phím /"
                aria-keyshortcuts="/"
                className={cn(
                    "flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all border",
                    isOpen
                        ? "bg-main border-main shadow-sm"
                        : "bg-transparent border-transparent hover:bg-secondary",
                )}
            >
                <List size={14} className="text-muted" />
                <span className="text-[12px] font-medium">Market</span>
                <kbd
                    className="pointer-events-none inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded border border-main bg-secondary/70 px-1 font-mono text-[10px] font-semibold leading-none text-muted tabular-nums"
                    aria-hidden
                >
                    /
                </kbd>
                <ChevronDown
                    size={12}
                    className={cn(
                        "text-muted transition-transform",
                        isOpen && "rotate-180",
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.13, ease: "easeOut" }}
                            className="absolute left-0 mt-2 w-80 bg-main border border-main rounded-lg shadow-2xl z-50 overflow-hidden"
                        >
                            {/* Search input */}
                            <div className="p-3 border-b border-main bg-secondary/40">
                                <div className="relative">
                                    <Search
                                        size={12}
                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search symbol or name..."
                                        value={filter}
                                        onChange={(e) =>
                                            setFilter(e.target.value)
                                        }
                                        className="w-full bg-main border border-main rounded-md py-1.5 pl-8 pr-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="max-h-[440px] overflow-y-auto thin-scrollbar">
                                {hasQuery ? (
                                    /* ─── Search results ─── */
                                    <>
                                        <div className="px-3 py-2 text-[9px] font-bold text-muted uppercase tracking-widest bg-secondary/20">
                                            Results ({filteredAssets.length})
                                        </div>
                                        {filteredAssets.length === 0 ? (
                                            <div className="p-8 text-center text-muted text-[12px]">
                                                No coins found
                                            </div>
                                        ) : (
                                            filteredAssets.map((asset) => (
                                                <AssetRow
                                                    key={asset.id}
                                                    asset={asset}
                                                    isSelected={
                                                        selectedSymbol ===
                                                        asset.id
                                                    }
                                                    onClick={() =>
                                                        handleSelect(asset.id)
                                                    }
                                                />
                                            ))
                                        )}
                                    </>
                                ) : (
                                    /* ─── No query: show Recents + Trending + Top ─── */
                                    <>
                                        {/* Recently viewed */}
                                        {recentAssets.length > 0 && (
                                            <>
                                                <div className="px-3 py-2 flex items-center space-x-1.5 bg-secondary/20">
                                                    <Clock
                                                        size={10}
                                                        className="text-muted"
                                                    />
                                                    <span className="text-[9px] font-bold text-muted uppercase tracking-widest">
                                                        Recently Viewed
                                                    </span>
                                                </div>
                                                {recentAssets.map((asset) => (
                                                    <AssetRow
                                                        key={asset.id}
                                                        asset={asset}
                                                        isSelected={
                                                            selectedSymbol ===
                                                            asset.id
                                                        }
                                                        onClick={() =>
                                                            handleSelect(
                                                                asset.id,
                                                            )
                                                        }
                                                        badge={
                                                            <span className="text-[8px] text-muted bg-secondary px-1 py-0.5 rounded">
                                                                recent
                                                            </span>
                                                        }
                                                    />
                                                ))}
                                            </>
                                        )}

                                        {/* Trending (top movers) */}
                                        <div className="px-3 py-2 flex items-center space-x-1.5 bg-secondary/20 border-t border-main">
                                            <Flame
                                                size={10}
                                                className="text-orange-400"
                                            />
                                            <span className="text-[9px] font-bold text-muted uppercase tracking-widest">
                                                Top Movers
                                            </span>
                                        </div>
                                        {trending.map((asset) => (
                                            <AssetRow
                                                key={asset.id}
                                                asset={asset}
                                                isSelected={
                                                    selectedSymbol === asset.id
                                                }
                                                onClick={() =>
                                                    handleSelect(asset.id)
                                                }
                                                badge={
                                                    <span
                                                        className={cn(
                                                            "text-[8px] font-bold px-1 py-0.5 rounded",
                                                            asset.changePercent >=
                                                                0
                                                                ? "text-emerald-500 bg-emerald-500/10"
                                                                : "text-rose-500 bg-rose-500/10",
                                                        )}
                                                    >
                                                        {asset.changePercent >=
                                                        0
                                                            ? "+"
                                                            : ""}
                                                        {asset.changePercent.toFixed(
                                                            1,
                                                        )}
                                                        %
                                                    </span>
                                                }
                                            />
                                        ))}

                                        {/* All top assets */}
                                        <div className="px-3 py-2 flex items-center space-x-1.5 bg-secondary/20 border-t border-main">
                                            <span className="text-[9px] font-bold text-muted uppercase tracking-widest">
                                                Top Assets (USDT)
                                            </span>
                                        </div>
                                        {assets.map((asset) => (
                                            <AssetRow
                                                key={asset.id}
                                                asset={asset}
                                                isSelected={
                                                    selectedSymbol === asset.id
                                                }
                                                onClick={() =>
                                                    handleSelect(asset.id)
                                                }
                                            />
                                        ))}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
