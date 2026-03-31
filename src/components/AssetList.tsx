"use client";

import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
} from "react";
import { cn } from "../lib/utils";
import {
    ArrowUpRight,
    ArrowDownRight,
    List,
    ChevronDown,
    Search,
    Clock,
    Flame,
    Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMarket } from "../context/MarketContext";
import { Asset } from "../services/binanceService";
import { TokenAvatar } from "./TokenAvatar";
import { usePathname, useRouter } from "next/navigation";
import { useUniverse } from "../context/UniverseContext";

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
}) => {
    const { universe } = useUniverse();
    return (
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
                <div className="text-[10px] text-muted">
                    {universe === "stock" ? "VN Stock feed" : "Binance"}
                </div>
            </div>
        </div>
        <div className="text-right">
            <div className="text-[12px] font-mono font-medium">
                {universe === "stock"
                    ? priceFmt(asset.price)
                    : `$${priceFmt(asset.price)}`}
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
};

// ─── WatchlistDropdown ────────────────────────────────────────────────────────
export const WatchlistDropdown = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const [recents, setRecents] = useState<string[]>([]);
    const {
        assets,
        selectedSymbol,
        setSelectedSymbol,
        marketType,
        isLoading,
        isFuturesLoading,
    } = useMarket();
    const assetsLoading = marketType === "futures" ? isFuturesLoading : isLoading;

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
            // Keep behavior consistent across pages:
            // selecting a market pair from this dropdown should open chart page.
            if (pathname !== "/") {
                router.push("/");
            }
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
        [pathname, router, setSelectedSymbol],
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
                                                {assetsLoading ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <Loader2
                                                            size={14}
                                                            className="animate-spin"
                                                        />
                                                        Loading...
                                                    </span>
                                                ) : (
                                                    "No assets found"
                                                )}
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
                                                Top Assets
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

// ─── QuickSearchDropdown (topbar) ──────────────────────────────────────────
// Biến ô "Quick search" thành dropdown chọn symbol (tương tự WatchlistDropdown,
// nhưng trigger là chính ô input thay vì nút "Market /").
export const QuickSearchDropdown = () => {
    const router = useRouter();
    const pathname = usePathname();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const [recents, setRecents] = useState<string[]>([]);

    const {
        assets,
        selectedSymbol,
        setSelectedSymbol,
        marketType,
        isLoading,
        isFuturesLoading,
    } = useMarket();
    const assetsLoading = marketType === "futures" ? isFuturesLoading : isLoading;

    const MAX_QUICK_RESULTS = 20;
    const MAX_TOP_ASSETS_PREVIEW = 30;

    // Load recents from localStorage on mount
    useEffect(() => {
        setRecents(loadRecents());
    }, []);

    const trending = useMemo(() => {
        // Top movers: chọn theo % thay đổi tuyệt đối
        return [...assets]
            .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
            .slice(0, 5);
    }, [assets]);

    const recentAssets = useMemo(() => {
        return recents
            .map((id) => assets.find((a) => a.id === id))
            .filter(Boolean) as Asset[];
    }, [recents, assets]);

    const filteredAssets = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return [];
        return assets.filter(
            (a) =>
                a.symbol.toLowerCase().includes(q) ||
                a.id.toLowerCase().includes(q),
        );
    }, [assets, filter]);

    const shownFilteredAssets = useMemo(() => {
        return filteredAssets.slice(0, MAX_QUICK_RESULTS);
    }, [filteredAssets]);

    const topAssetsPreview = useMemo(() => {
        return assets.slice(0, MAX_TOP_ASSETS_PREVIEW);
    }, [assets]);

    const hasQuery = filter.trim().length > 0;

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
            // Focus sau khi render dropdown để tránh giật focus
            setTimeout(() => inputRef.current?.focus(), 0);
        };

        const onEsc = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            setIsOpen(false);
        };

        document.addEventListener("keydown", onKey);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("keydown", onEsc);
        };
    }, []);

    const handleSelect = useCallback(
        (id: string) => {
            setSelectedSymbol(id);
            setIsOpen(false);
            setFilter("");

            // Keep behavior consistent across pages:
            // selecting a market pair should open chart page.
            if (pathname !== "/") {
                router.push("/");
            }

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
        [pathname, router, setSelectedSymbol],
    );

    return (
        <div className="relative group">
            <div className="relative">
                <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Quick search..."
                    value={filter}
                    onChange={(e) => {
                        setFilter(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="bg-secondary border border-transparent hover:border-main rounded-md py-1.5 pl-8 pr-12 text-[12px] w-44 focus:w-60 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                    aria-keyshortcuts="/"
                    title="Mở Quick search — phím /"
                />
                <kbd
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-main bg-secondary/70 px-1 font-mono text-[10px] font-semibold leading-none text-muted tabular-nums"
                    aria-hidden
                >
                    /
                </kbd>
            </div>

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
                            <div className="max-h-[440px] overflow-y-auto thin-scrollbar">
                                {hasQuery ? (
                                    <>
                                        <div className="px-3 py-2 text-[9px] font-bold text-muted uppercase tracking-widest bg-secondary/20">
                                            Results ({shownFilteredAssets.length})
                                        </div>
                                        {shownFilteredAssets.length === 0 ? (
                                            <div className="p-8 text-center text-muted text-[12px]">
                                                {assetsLoading ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <Loader2
                                                            size={14}
                                                            className="animate-spin"
                                                        />
                                                        Loading...
                                                    </span>
                                                ) : (
                                                    "No assets found"
                                                )}
                                            </div>
                                        ) : (
                                            shownFilteredAssets.map((asset) => (
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
                                    <>
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
                                                            handleSelect(asset.id)
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
                                                        {asset.changePercent >= 0
                                                            ? "+"
                                                            : ""}
                                                        {asset.changePercent.toFixed(1)}
                                                        %
                                                    </span>
                                                }
                                            />
                                        ))}

                                        <div className="px-3 py-2 flex items-center space-x-1.5 bg-secondary/20 border-t border-main">
                                            <span className="text-[9px] font-bold text-muted uppercase tracking-widest">
                                                Top Assets
                                            </span>
                                        </div>
                                        {topAssetsPreview.map((asset) => (
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
