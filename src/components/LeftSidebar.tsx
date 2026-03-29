"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "../lib/utils";
import { useMarket } from "../context/MarketContext";
import { Asset } from "../services/binanceService";
import { TokenAvatar } from "./TokenAvatar";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowLeftRight,
    ArrowUpDown,
    ArrowDown,
    ArrowUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ─── Formatters ───────────────────────────────────────────────────────────────
const priceFmt = (v: number) =>
    v < 0.001
        ? v.toFixed(6)
        : v < 1
          ? v.toFixed(4)
          : v < 100
            ? v.toFixed(3)
            : v.toLocaleString("en-US", { minimumFractionDigits: 2 });

// ─── Sort state ───────────────────────────────────────────────────────────────
type SortMode = "volume" | "change_desc" | "change_asc";

function sortAssets(assets: Asset[], mode: SortMode): Asset[] {
    const copy = [...assets];
    if (mode === "change_desc")
        return copy.sort((a, b) => b.changePercent - a.changePercent);
    if (mode === "change_asc")
        return copy.sort((a, b) => a.changePercent - b.changePercent);
    return copy; // 'volume' — already sorted by volume from context
}

function nextSortMode(current: SortMode): SortMode {
    if (current === "volume") return "change_desc";
    if (current === "change_desc") return "change_asc";
    return "volume";
}

// ─── Coin Row ─────────────────────────────────────────────────────────────────
const CoinRow = ({
    asset,
    isSelected,
    onClick,
}: {
    asset: Asset;
    isSelected: boolean;
    onClick: () => void;
}) => {
    const isFutures = asset.marketType === "futures";
    const fundingRate = asset.fundingRate;

    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center justify-between px-3 py-2 cursor-pointer transition-all border-b border-main last:border-0",
                isSelected ? "bg-accent/8" : "hover:bg-secondary",
            )}
        >
            <div className="flex items-center space-x-2 min-w-0">
                <TokenAvatar
                    symbol={asset.symbol}
                    logoUrl={asset.logoUrl}
                    size={24}
                    selected={isSelected}
                />
                <div className="min-w-0">
                    <div className="flex items-center gap-1">
                        <span
                            className={cn(
                                "text-[11px] font-semibold truncate",
                                isSelected && "text-accent",
                            )}
                        >
                            {asset.symbol}
                        </span>
                        {isFutures && (
                            <span className="text-[7px] font-bold px-1 py-px rounded bg-amber-400/15 text-amber-400 border border-amber-400/20 shrink-0">
                                PERP
                            </span>
                        )}
                    </div>
                    <div className="text-[9px] text-muted truncate">
                        {isFutures && typeof fundingRate === "number" ? (
                            <span
                                className={cn(
                                    "font-mono",
                                    fundingRate >= 0
                                        ? "text-emerald-500"
                                        : "text-rose-500",
                                )}
                            >
                                {fundingRate >= 0 ? "+" : ""}
                                {(fundingRate * 100).toFixed(4)}% fund
                            </span>
                        ) : (
                            asset.id
                        )}
                    </div>
                </div>
            </div>
            <div className="text-right shrink-0 ml-2">
                <div className="text-[11px] font-mono">
                    {priceFmt(asset.price)}
                </div>
                <div
                    className={cn(
                        "text-[10px] font-medium",
                        asset.changePercent >= 0
                            ? "text-emerald-500"
                            : "text-rose-500",
                    )}
                >
                    {asset.changePercent >= 0 ? "+" : ""}
                    {asset.changePercent.toFixed(2)}%
                </div>
            </div>
        </div>
    );
};

// ─── Market bar: status + Spot ↔ Futures toggle ───────────────────────────────
const MarketBar = () => {
    const {
        marketType,
        setMarketType,
        assets,
        isLoading,
        isFuturesLoading,
        spotStreamStatus,
        futuresStreamStatus,
        universe,
    } = useMarket();
    const isFutures = marketType === "futures";
    const loading = isFutures ? isFuturesLoading : isLoading;
    const streamStatus = isFutures ? futuresStreamStatus : spotStreamStatus;

    const label =
        universe === "stock"
            ? isFutures
                ? "Derivatives · Stock Feed"
                : "Primary Market · Stock Feed"
            : isFutures
              ? "USD-M Perpetual · Binance Futures"
              : "Spot Market · Binance";

    return (
        <div className="px-3 py-1.5 border-b border-main bg-secondary/10 shrink-0 space-y-1.5">
            <div className="flex items-center gap-1.5">
                <span
                    className={cn(
                        "inline-block h-1.5 w-1.5 rounded-full shrink-0",
                        streamStatus === "connected" && !loading
                            ? "bg-emerald-500"
                            : loading || streamStatus === "connecting"
                              ? "animate-pulse bg-amber-400"
                              : streamStatus === "error"
                                ? "bg-rose-500"
                                : "bg-sky-500",
                    )}
                />
                <span className="text-[9px] text-muted truncate flex-1">
                    {label} ·{" "}
                    {streamStatus === "connected"
                        ? "Live"
                        : streamStatus === "connecting"
                          ? "Syncing"
                          : streamStatus === "error"
                            ? "Error"
                            : "Reconnecting"}
                </span>
                <span className="text-[9px] text-muted tabular-nums">
                    {assets.length.toLocaleString("en-US")} assets
                </span>
            </div>

            {/* Explicit, discoverable market switch controls */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                <button
                    onClick={() => setMarketType("spot")}
                    className={cn(
                        "h-6 rounded border text-[9px] font-semibold uppercase tracking-wider transition-colors",
                        !isFutures
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500"
                            : "border-main text-muted hover:text-main hover:bg-secondary",
                    )}
                    title={
                        universe === "stock"
                            ? "Hiển thị dữ liệu thị trường cơ sở (mock)"
                            : "Hiển thị dữ liệu Spot"
                    }
                >
                    {universe === "stock" ? "Primary" : "Spot"}
                </button>

                <span className="flex items-center justify-center text-muted">
                    <ArrowLeftRight size={10} />
                </span>

                <button
                    onClick={() => setMarketType("futures")}
                    className={cn(
                        "h-6 rounded border text-[9px] font-semibold uppercase tracking-wider transition-colors",
                        isFutures
                            ? "border-amber-400/40 bg-amber-400/15 text-amber-400"
                            : "border-main text-muted hover:text-main hover:bg-secondary",
                    )}
                    title={
                        universe === "stock"
                            ? "Hiển thị dữ liệu phái sinh (mock)"
                            : "Hiển thị dữ liệu USD-M Futures"
                    }
                >
                    {universe === "stock" ? "Derivatives" : "Futures"}
                </button>
            </div>
        </div>
    );
};

// ─── Sort icon helper ─────────────────────────────────────────────────────────
const SortIcon = ({ mode }: { mode: SortMode }) => {
    if (mode === "change_desc")
        return <ArrowDown size={9} className="text-accent" />;
    if (mode === "change_asc")
        return <ArrowUp size={9} className="text-accent" />;
    return <ArrowUpDown size={9} className="text-muted/60" />;
};

// ─── Main Left Sidebar ────────────────────────────────────────────────────────
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 260;
const STOCK_PAGE_SIZE = 25;

export type LeftSidebarProps = {
    /**
     * Dùng trên trang con (vd. /transactions): cùng UI coin list + MarketBar,
     * luôn mở, không nút thu gọn như trang chủ.
     */
    embedded?: boolean;
};

export const LeftSidebar = ({ embedded = false }: LeftSidebarProps = {}) => {
    const {
        assets,
        selectedSymbol,
        setSelectedSymbol,
        universe,
        hydrateStockSymbols,
    } = useMarket();
    const [isOpen, setIsOpen] = useState(true);
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const [search, setSearch] = useState("");
    const [sortMode, setSortMode] = useState<SortMode>("volume");
    const [stockVisibleCount, setStockVisibleCount] = useState(STOCK_PAGE_SIZE);
    const listRef = useRef<HTMLDivElement | null>(null);

    const isDragging = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(DEFAULT_WIDTH);

    const q = search.toLowerCase();
    // Filtered then sorted (symbol hoặc pair id)
    const displayAssets = sortAssets(
        assets.filter(
            (a) =>
                a.symbol.toLowerCase().includes(q) ||
                a.id.toLowerCase().includes(q),
        ),
        sortMode,
    );
    const visibleAssets =
        universe === "stock"
            ? displayAssets.slice(0, stockVisibleCount)
            : displayAssets;

    const panelOpen = embedded || isOpen;

    useEffect(() => {
        if (universe !== "stock") return;
        setStockVisibleCount(STOCK_PAGE_SIZE);
    }, [search, sortMode, universe, assets.length]);

    useEffect(() => {
        if (universe !== "stock") return;
        const symbols = visibleAssets
            .slice(0, STOCK_PAGE_SIZE)
            .map((a) => a.id);
        void hydrateStockSymbols(symbols);
    }, [universe, visibleAssets, hydrateStockSymbols]);

    const handleListScroll = useCallback(() => {
        if (universe !== "stock") return;
        const el = listRef.current;
        if (!el) return;
        const nearBottom =
            el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
        if (!nearBottom) return;
        setStockVisibleCount((prev) =>
            Math.min(prev + STOCK_PAGE_SIZE, displayAssets.length),
        );
    }, [displayAssets.length, universe]);

    useEffect(() => {
        if (universe !== "stock") return;
        const start = Math.max(0, stockVisibleCount - STOCK_PAGE_SIZE);
        const nextSymbols = displayAssets
            .slice(start, stockVisibleCount)
            .map((asset) => asset.id);
        if (!nextSymbols.length) return;
        void hydrateStockSymbols(nextSymbols);
    }, [displayAssets, hydrateStockSymbols, stockVisibleCount, universe]);

    // ── Resize drag ──────────────────────────────────────────────────────────────
    const onMouseDown = useCallback(
        (e: React.MouseEvent) => {
            isDragging.current = true;
            startX.current = e.clientX;
            startWidth.current = width;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        },
        [width],
    );

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const delta = e.clientX - startX.current;
            const newWidth = Math.min(
                MAX_WIDTH,
                Math.max(MIN_WIDTH, startWidth.current + delta),
            );
            setWidth(newWidth);
        };
        const onMouseUp = () => {
            if (!isDragging.current) return;
            isDragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    const sidebarBody = (
        <>
            {/* Market status + toggle */}
            <MarketBar />

            {/* Search */}
            <div className="p-2 border-b border-main shrink-0">
                <div className="relative">
                    <Search
                        size={11}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
                    />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-secondary border border-main rounded-md py-1.5 pl-7 pr-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                </div>
            </div>

            {/* Column headers — "Price / 24h" is clickable to sort */}
            <div className="px-3 py-1.5 grid grid-cols-2 text-[9px] font-semibold text-muted uppercase tracking-wider border-b border-main bg-secondary/30 shrink-0">
                <span>Symbol</span>
                <button
                    onClick={() => setSortMode(nextSortMode(sortMode))}
                    className="flex items-center justify-end gap-1 hover:text-main transition-colors"
                    title={
                        sortMode === "volume"
                            ? "Sort by 24h Change ↓"
                            : sortMode === "change_desc"
                              ? "Sort by 24h Change ↑"
                              : "Back to Volume sort"
                    }
                >
                    Price / 24h
                    <SortIcon mode={sortMode} />
                </button>
            </div>

            {/* Coin list */}
            <div
                ref={listRef}
                onScroll={handleListScroll}
                className="flex-1 min-h-0 overflow-y-auto thin-scrollbar"
            >
                {displayAssets.length === 0 ? (
                    <div className="p-6 text-center text-muted text-[11px]">
                        No assets found
                    </div>
                ) : (
                    visibleAssets.map((asset) => (
                        <CoinRow
                            key={asset.id}
                            asset={asset}
                            isSelected={selectedSymbol === asset.id}
                            onClick={() => setSelectedSymbol(asset.id)}
                        />
                    ))
                )}
            </div>
        </>
    );

    const panelStyle = {
        width,
        minWidth: width,
        maxWidth: width,
    } as const;

    const panelShellClass =
        "h-full min-h-0 flex flex-col bg-main border-r border-main overflow-hidden relative";

    return (
        <div className="relative flex h-full min-h-0 shrink-0">
            {embedded ? (
                panelOpen && (
                    <div style={panelStyle} className={panelShellClass}>
                        {sidebarBody}
                    </div>
                )
            ) : (
                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            style={panelStyle}
                            className={panelShellClass}
                        >
                            {sidebarBody}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Resize handle */}
            {panelOpen && (
                <div
                    onMouseDown={onMouseDown}
                    className="absolute right-0 top-0 w-1 h-full cursor-col-resize z-20 bg-transparent hover:bg-accent/30 transition-colors group"
                >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-12 bg-main border border-main rounded-full group-hover:bg-accent/50 transition-colors" />
                </div>
            )}

            {/* Collapse / expand toggle — chỉ trang chủ */}
            {!embedded && (
                <button
                    onClick={() => setIsOpen((v) => !v)}
                    className={cn(
                        "absolute z-30 flex items-center justify-center w-5 h-10 bg-main border border-main rounded-r-md shadow-sm transition-all hover:bg-secondary top-1/2 -translate-y-1/2",
                        isOpen ? "right-[-20px]" : "right-[-20px] left-0",
                    )}
                    title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    {isOpen ? (
                        <ChevronLeft size={12} className="text-muted" />
                    ) : (
                        <ChevronRight size={12} className="text-muted" />
                    )}
                </button>
            )}
        </div>
    );
};
