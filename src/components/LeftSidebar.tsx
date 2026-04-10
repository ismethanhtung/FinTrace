"use client";

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils";
import { useMarket } from "../context/MarketContext";
import { Asset } from "../services/binanceService";
import { TokenAvatar } from "./TokenAvatar";
import { useDnseBoardStream } from "../hooks/useDnseBoardStream";
import { useVietcapBoardSnapshot } from "../hooks/useVietcapBoardSnapshot";
import {
    Search,
    ArrowLeftRight,
    ArrowUpDown,
    ArrowDown,
    ArrowUp,
    Info,
    Funnel,
    X,
    Star,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useI18n } from "../context/I18nContext";
import { resolveStockTone, toneClassForStock } from "../lib/stockTone";
import { useUserFavorites } from "../hooks/useUserFavorites";

const STOCK_DNSE_PRICE_SCALE = 1000;

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

function normalizeFilterValue(value: string | undefined): string {
    return (value ?? "").trim().toUpperCase();
}

function normalizeFilterList(values: string[] | undefined): string[] {
    if (!values?.length) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
        const normalized = normalizeFilterValue(value);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        out.push(normalized);
    }
    return out;
}

function keepOnlyValidSelections(
    prev: string[],
    validOptions: string[],
): string[] {
    if (!prev.length) return prev;
    const validSet = new Set(validOptions.map((option) => option.trim()));
    const next = prev.filter((item) => validSet.has(item.trim()));
    if (
        next.length === prev.length &&
        next.every((value, index) => value === prev[index])
    ) {
        return prev;
    }
    return next;
}

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

function matchesSidebarSearch(asset: Asset, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    return (
        asset.symbol.toLowerCase().includes(q) ||
        asset.id.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q) ||
        asset.stockProfile?.organName?.toLowerCase().includes(q) ||
        asset.stockProfile?.organShortName?.toLowerCase().includes(q) ||
        asset.binanceAssetInfo?.assetName?.toLowerCase().includes(q) ||
        false
    );
}

function stockTooltipText(asset: Asset): string {
    const profile = asset.stockProfile;
    if (!profile) return "";
    const lines = [
        profile.organName || asset.name || asset.symbol,
        profile.organShortName ? `Tên ngắn: ${profile.organShortName}` : "",
        profile.exchange ? `Sàn: ${profile.exchange}` : "",
        profile.sector ? `Sector: ${profile.sector}` : "",
        profile.industry ? `Industry: ${profile.industry}` : "",
        profile.subgroup ? `Subgroup: ${profile.subgroup}` : "",
        profile.icbName ? `ICB: ${profile.icbName}` : "",
        profile.icbCode ? `ICB Code: ${profile.icbCode}` : "",
        profile.indexMembership?.length
            ? `Index: ${profile.indexMembership.slice(0, 6).join(", ")}`
            : "",
    ].filter(Boolean);
    return lines.join("\n");
}

function coinTooltipText(asset: Asset): string {
    const info = asset.binanceAssetInfo;
    if (!info) return "";
    const lines = [
        info.assetName || asset.name || asset.symbol,
        info.assetCode ? `Code: ${info.assetCode}` : "",
        info.assetId ? `ID: ${info.assetId}` : "",
        asset.tags?.length ? `Tags: ${asset.tags.join(", ")}` : "",
        info.plateType ? `Plate: ${info.plateType}` : "",
        typeof info.trading === "boolean"
            ? `Trading: ${info.trading ? "ON" : "OFF"}`
            : "",
        typeof info.delisted === "boolean"
            ? `Delisted: ${info.delisted ? "YES" : "NO"}`
            : "",
        typeof info.preDelist === "boolean"
            ? `Pre-Delist: ${info.preDelist ? "YES" : "NO"}`
            : "",
        typeof info.assetDigit === "number"
            ? `Asset Digit: ${info.assetDigit}`
            : "",
        typeof info.feeDigit === "number" ? `Fee Digit: ${info.feeDigit}` : "",
    ].filter(Boolean);
    return lines.join("\n");
}

const AssetInfoTooltip = ({
    text,
    ariaLabel,
}: {
    text: string;
    ariaLabel: string;
}) => {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [tooltipPos, setTooltipPos] = useState<{
        top: number;
        left: number;
    } | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);

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

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-label={ariaLabel}
                onMouseEnter={openTooltip}
                onMouseLeave={closeTooltip}
                onFocus={openTooltip}
                onBlur={closeTooltip}
                className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted hover:text-main transition-colors"
            >
                <Info size={11} />
            </button>
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
};

// ─── Coin Row ─────────────────────────────────────────────────────────────────
const CoinRow = ({
    asset,
    isSelected,
    onClick,
    stockToneClass,
    isFavorite,
    onToggleFavorite,
}: {
    asset: Asset;
    isSelected: boolean;
    onClick: () => void;
    stockToneClass?: string;
    isFavorite: boolean;
    onToggleFavorite: () => void;
}) => {
    const { t } = useI18n();
    const isFutures = asset.marketType === "futures";
    const fundingRate = asset.fundingRate;
    const infoHint = asset.stockProfile
        ? stockTooltipText(asset)
        : coinTooltipText(asset);
    const hasValidPrice = Number.isFinite(asset.price) && asset.price > 0;
    const hasValidChange =
        Number.isFinite(asset.changePercent) &&
        (hasValidPrice || Math.abs(asset.changePercent) > 1e-6);

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
                                stockToneClass,
                            )}
                        >
                            {asset.symbol}
                        </span>
                        {infoHint && (
                            <AssetInfoTooltip
                                text={infoHint}
                                ariaLabel={t("leftSidebar.assetInfo")}
                            />
                        )}
                        {isFutures && (
                            <span className="text-[7px] font-bold px-1 py-px rounded bg-amber-400/15 text-amber-400 border border-amber-400/20 shrink-0">
                                PERP
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggleFavorite();
                            }}
                            className={cn(
                                "ml-1 inline-flex h-5 w-5 items-center justify-center transition-colors",
                                isFavorite
                                    ? "text-amber-500"
                                    : "text-muted hover:text-main hover:bg-secondary",
                            )}
                            aria-label={t("ticker.toggleFavorite")}
                            title={t("ticker.toggleFavorite")}
                            tabIndex={-1}
                        >
                            <Star
                                size={10}
                                className={cn(isFavorite && "fill-current")}
                            />
                        </button>
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
                <div className="text-[11px] font-mono text-main">
                    {hasValidPrice ? priceFmt(asset.price) : "--"}
                </div>
                <div
                    className={cn(
                        "text-[10px] font-medium",
                        stockToneClass
                            ? stockToneClass
                            : !hasValidChange
                              ? "text-muted"
                              : asset.changePercent >= 0
                                ? "text-emerald-500"
                                : "text-rose-500",
                    )}
                >
                    {hasValidChange
                        ? `${asset.changePercent >= 0 ? "+" : ""}${asset.changePercent.toFixed(2)}%`
                        : "--"}
                </div>
            </div>
        </div>
    );
};

const CoinRowSkeleton = () => {
    return (
        <div className="flex min-h-[40px] items-center justify-between px-3 py-2 border-b border-main last:border-0">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className="h-6 w-6 rounded-full bg-secondary animate-pulse shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3.5 w-16 rounded bg-secondary animate-pulse" />
                    <div className="h-3 w-24 rounded bg-secondary/80 animate-pulse" />
                </div>
            </div>
            <div className="text-right shrink-0 ml-2 space-y-1.5">
                <div className="h-3.5 w-14 rounded bg-secondary animate-pulse ml-auto" />
                <div className="h-3 w-10 rounded bg-secondary/80 animate-pulse ml-auto" />
            </div>
        </div>
    );
};

const LeftSidebarSkeleton = ({ rows = 10 }: { rows?: number }) => {
    return (
        <div>
            {Array.from({ length: rows }).map((_, index) => (
                <CoinRowSkeleton key={index} />
            ))}
        </div>
    );
};

// ─── Market bar: status + Spot ↔ Futures toggle ───────────────────────────────
const MarketBar = () => {
    const { t } = useI18n();
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
    const primaryButtonLabel =
        universe === "stock"
            ? t("leftSidebar.marketPrimaryButton")
            : t("leftSidebar.marketSpotButton");
    const secondaryButtonLabel =
        universe === "stock"
            ? t("leftSidebar.marketDerivativesButton")
            : t("leftSidebar.marketFuturesButton");

    const label =
        universe === "stock"
            ? isFutures
                ? t("leftSidebar.marketDerivatives")
                : t("leftSidebar.marketPrimary")
            : isFutures
              ? t("leftSidebar.marketFutures")
              : t("leftSidebar.marketSpot");

    return (
        <div className="px-2 py-1.5 border-b border-main bg-secondary/10 shrink-0 space-y-1.5">
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
                        ? t("leftSidebar.live")
                        : streamStatus === "connecting"
                          ? t("leftSidebar.syncing")
                          : streamStatus === "error"
                            ? t("leftSidebar.error")
                            : t("leftSidebar.reconnecting")}
                </span>
                <span className="text-[9px] text-muted tabular-nums">
                    {t("leftSidebar.assetsCount", {
                        count: assets.length.toLocaleString("en-US"),
                    })}
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
                            ? t("leftSidebar.marketPrimaryTitle")
                            : t("leftSidebar.marketSpotTitle")
                    }
                >
                    {primaryButtonLabel}
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
                            ? t("leftSidebar.marketDerivativesTitle")
                            : t("leftSidebar.marketFuturesTitle")
                    }
                >
                    {secondaryButtonLabel}
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
    const { t } = useI18n();
    const {
        assets: baseAssets,
        selectedSymbol,
        setSelectedSymbol,
        universe,
        hydrateStockSymbols,
        marketType,
        isLoading,
        isFuturesLoading,
    } = useMarket();
    const { isFavorite, toggleFavorite } = useUserFavorites();
    const streamSymbols = useMemo(
        () =>
            universe === "stock"
                ? baseAssets.map((asset) => asset.symbol.trim().toUpperCase())
                : [],
        [baseAssets, universe],
    );
    const { dataBySymbol: dnseBySymbol } = useDnseBoardStream(streamSymbols, {
        board: "G1",
        boards: ["G1", "G2", "G3"],
        resolution: "1",
    });
    const vietcapSnapshotGroups = useMemo(
        () => ["VN30", "HNX30", "HOSE", "HNX", "UPCOM"],
        [],
    );
    const { snapshotBySymbol: vietcapSnapshotBySymbol } =
        useVietcapBoardSnapshot({
            enabled: universe === "stock",
            groups: vietcapSnapshotGroups,
            refreshIntervalMs: 45_000,
        });
    const assets = useMemo<Asset[]>(
        () =>
            baseAssets.map((asset) => {
                if (universe !== "stock") return asset;
                const stream = dnseBySymbol[asset.symbol.trim().toUpperCase()];
                if (!Number.isFinite(stream?.price)) return asset;
                const livePrice = stream!.price * STOCK_DNSE_PRICE_SCALE;
                const liveRef = Number.isFinite(stream?.ref)
                    ? stream!.ref * STOCK_DNSE_PRICE_SCALE
                    : Number.NaN;
                const liveChange =
                    Number.isFinite(liveRef) && Number.isFinite(livePrice)
                        ? livePrice - liveRef
                        : Number.isFinite(asset.change)
                          ? asset.change
                          : 0;
                const liveChangePercent =
                    Number.isFinite(liveRef) && liveRef > 0
                        ? (liveChange / liveRef) * 100
                        : asset.changePercent;
                return {
                    ...asset,
                    price: livePrice,
                    change: Number.isFinite(liveChange) ? liveChange : 0,
                    changePercent: Number.isFinite(liveChangePercent)
                        ? liveChangePercent
                        : asset.changePercent,
                };
            }),
        [baseAssets, dnseBySymbol, universe],
    );
    const stockToneClassBySymbol = useMemo(() => {
        if (universe !== "stock") return {};
        const out: Record<string, string> = {};
        for (const asset of assets) {
            const symbol = asset.symbol.trim().toUpperCase();
            const stream = dnseBySymbol[symbol];
            const snapshot = vietcapSnapshotBySymbol[symbol];
            const scaledPrice = Number.isFinite(stream?.price)
                ? stream!.price * STOCK_DNSE_PRICE_SCALE
                : Number.isFinite(snapshot?.price)
                  ? snapshot!.price
                  : Number.NaN;
            const scaledRef = Number.isFinite(stream?.ref)
                ? stream!.ref * STOCK_DNSE_PRICE_SCALE
                : Number.isFinite(snapshot?.ref)
                  ? snapshot!.ref
                  : Number.NaN;
            const scaledCeiling = Number.isFinite(stream?.ceiling)
                ? stream!.ceiling * STOCK_DNSE_PRICE_SCALE
                : Number.isFinite(snapshot?.ceiling)
                  ? snapshot!.ceiling
                  : Number.NaN;
            const scaledFloor = Number.isFinite(stream?.floor)
                ? stream!.floor * STOCK_DNSE_PRICE_SCALE
                : Number.isFinite(snapshot?.floor)
                  ? snapshot!.floor
                  : Number.NaN;
            const tone = resolveStockTone(
                scaledPrice,
                scaledRef,
                scaledCeiling,
                scaledFloor,
            );
            out[symbol] = toneClassForStock(tone);
        }
        return out;
    }, [assets, dnseBySymbol, universe, vietcapSnapshotBySymbol]);
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const [search, setSearch] = useState("");
    const [sortMode, setSortMode] = useState<SortMode>("volume");
    const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
    const [selectedIndexes, setSelectedIndexes] = useState<string[]>([]);
    const [selectedCoinTags, setSelectedCoinTags] = useState<string[]>([]);
    const [favoriteOnly, setFavoriteOnly] = useState(false);
    const [stockFilterOpen, setStockFilterOpen] = useState(false);
    const [coinFilterOpen, setCoinFilterOpen] = useState(false);
    const [stockVisibleCount, setStockVisibleCount] = useState(STOCK_PAGE_SIZE);
    const listRef = useRef<HTMLDivElement | null>(null);
    const stockFilterRef = useRef<HTMLDivElement | null>(null);
    const coinFilterRef = useRef<HTMLDivElement | null>(null);

    const isDragging = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(DEFAULT_WIDTH);

    const stockFilterOptions = useMemo(() => {
        if (universe !== "stock") {
            return { exchanges: [], indexes: [] };
        }
        const exchanges = new Set<string>();
        const indexes = new Set<string>();
        for (const asset of assets) {
            const exchange = normalizeFilterValue(asset.stockProfile?.exchange);
            if (exchange) exchanges.add(exchange);
            for (const indexName of normalizeFilterList(
                asset.stockProfile?.indexMembership,
            )) {
                const normalized = indexName.trim();
                if (normalized) indexes.add(normalized);
            }
        }

        return {
            exchanges: Array.from(exchanges).sort((a, b) => a.localeCompare(b)),
            indexes: Array.from(indexes).sort((a, b) => a.localeCompare(b)),
        };
    }, [assets, universe]);

    const selectedExchangeSet = useMemo(
        () => new Set(selectedExchanges.map((item) => item.trim())),
        [selectedExchanges],
    );
    const selectedIndexSet = useMemo(
        () => new Set(selectedIndexes.map((item) => item.trim())),
        [selectedIndexes],
    );
    const coinFilterOptions = useMemo(() => {
        if (universe !== "coin") return [];
        const tags = new Set<string>();
        for (const asset of assets) {
            for (const tag of normalizeFilterList(asset.tags)) {
                const normalized = tag.trim();
                if (normalized) tags.add(normalized);
            }
        }
        return Array.from(tags).sort((a, b) => a.localeCompare(b));
    }, [assets, universe]);
    const selectedCoinTagSet = useMemo(
        () => new Set(selectedCoinTags.map((item) => item.trim())),
        [selectedCoinTags],
    );

    const q = search.trim().toLowerCase();
    const displayAssets = useMemo(
        () =>
            sortAssets(
                assets.filter((a) => {
                    if (favoriteOnly && !isFavorite(a.symbol)) return false;
                    const exchangeValue = normalizeFilterValue(
                        a.stockProfile?.exchange,
                    );
                    const membershipValues = normalizeFilterList(
                        a.stockProfile?.indexMembership,
                    );
                    const tagValues = normalizeFilterList(a.tags);
                    const searchMatched = matchesSidebarSearch(a, q);

                    if (!searchMatched) return false;
                    if (universe === "coin") {
                        return selectedCoinTagSet.size === 0
                            ? true
                            : tagValues.some((tag) =>
                                  selectedCoinTagSet.has(tag),
                              );
                    }
                    if (universe !== "stock") return true;

                    const matchExchange =
                        selectedExchangeSet.size === 0
                            ? true
                            : selectedExchangeSet.has(exchangeValue);
                    const matchIndex =
                        selectedIndexSet.size === 0
                            ? true
                            : membershipValues.some((idx) =>
                                  selectedIndexSet.has(idx),
                              );
                    return matchExchange && matchIndex;
                }),
                sortMode,
            ),
        [
            assets,
            favoriteOnly,
            isFavorite,
            q,
            selectedCoinTagSet,
            selectedExchangeSet,
            selectedIndexSet,
            sortMode,
            universe,
        ],
    );
    const hasActiveStockFilter =
        universe === "stock" &&
        (selectedExchanges.length > 0 || selectedIndexes.length > 0);
    const hasActiveCoinFilter =
        universe === "coin" && selectedCoinTags.length > 0;
    const visibleAssets =
        universe === "stock"
            ? displayAssets.slice(0, stockVisibleCount)
            : displayAssets;

    const panelOpen = true;
    const assetsLoading =
        marketType === "futures" ? isFuturesLoading : isLoading;

    useEffect(() => {
        if (universe !== "stock") return;
        setStockVisibleCount(STOCK_PAGE_SIZE);
    }, [favoriteOnly, search, sortMode, selectedExchanges, selectedIndexes, universe]);

    useEffect(() => {
        if (universe !== "stock") return;
        setStockVisibleCount((prev) => {
            if (displayAssets.length <= 0) return 0;
            if (prev <= 0)
                return Math.min(STOCK_PAGE_SIZE, displayAssets.length);
            return Math.min(prev, displayAssets.length);
        });
    }, [displayAssets.length, universe]);

    useEffect(() => {
        if (universe !== "stock") return;
        setSelectedExchanges((prev) =>
            keepOnlyValidSelections(prev, stockFilterOptions.exchanges),
        );
        setSelectedIndexes((prev) =>
            keepOnlyValidSelections(prev, stockFilterOptions.indexes),
        );
    }, [stockFilterOptions, universe]);

    useEffect(() => {
        if (universe === "stock") return;
        setSelectedExchanges([]);
        setSelectedIndexes([]);
        setStockFilterOpen(false);
    }, [universe]);
    useEffect(() => {
        if (universe === "coin") return;
        setSelectedCoinTags([]);
        setCoinFilterOpen(false);
    }, [universe]);
    useEffect(() => {
        if (universe !== "coin") return;
        setSelectedCoinTags((prev) =>
            keepOnlyValidSelections(prev, coinFilterOptions),
        );
    }, [coinFilterOptions, universe]);

    useEffect(() => {
        if (!stockFilterOpen && !coinFilterOpen) return;
        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (stockFilterRef.current?.contains(target)) return;
            if (coinFilterRef.current?.contains(target)) return;
            setStockFilterOpen(false);
            setCoinFilterOpen(false);
        };
        document.addEventListener("mousedown", onMouseDown);
        return () => document.removeEventListener("mousedown", onMouseDown);
    }, [coinFilterOpen, stockFilterOpen]);

    const firstPageStockSymbols = useMemo(
        () =>
            universe === "stock"
                ? visibleAssets
                      .slice(0, STOCK_PAGE_SIZE)
                      .map((asset) => asset.id)
                : [],
        [universe, visibleAssets],
    );

    useEffect(() => {
        if (universe !== "stock") return;
        if (!firstPageStockSymbols.length) return;
        void hydrateStockSymbols(firstPageStockSymbols);
    }, [firstPageStockSymbols, hydrateStockSymbols, universe]);

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

    const currentStockWindowSymbols = useMemo(() => {
        if (universe !== "stock") return [];
        const start = Math.max(0, stockVisibleCount - STOCK_PAGE_SIZE);
        return displayAssets
            .slice(start, stockVisibleCount)
            .map((asset) => asset.id);
    }, [displayAssets, stockVisibleCount, universe]);

    useEffect(() => {
        if (universe !== "stock") return;
        if (!currentStockWindowSymbols.length) return;
        void hydrateStockSymbols(currentStockWindowSymbols);
    }, [currentStockWindowSymbols, hydrateStockSymbols, universe]);

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
                        placeholder={t("leftSidebar.searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={cn(
                            "w-full bg-secondary border border-main rounded py-1.5 pl-7 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent/30",
                            universe === "stock" || universe === "coin"
                                ? "pr-10"
                                : "pr-3",
                        )}
                    />
                    {universe === "stock" && (
                        <div
                            ref={stockFilterRef}
                            className="absolute right-1 top-1/2 -translate-y-1/2 z-20"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setStockFilterOpen((prev) => !prev)
                                }
                                className={cn(
                                    "inline-flex h-6 w-6 items-center justify-center rounded border transition-colors focus:outline-none focus:ring-1",
                                    hasActiveStockFilter
                                        ? "border-sky-500/40 bg-sky-500/15 text-sky-400 focus:ring-sky-500/40"
                                        : "border-main bg-main text-muted hover:text-main focus:ring-accent/30",
                                )}
                                title={t("leftSidebar.filterStock")}
                                aria-label={t("leftSidebar.openStockFilter")}
                            >
                                <Funnel size={11} />
                            </button>

                            <AnimatePresence>
                                {stockFilterOpen && (
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            y: 6,
                                            scale: 0.98,
                                        }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                        transition={{
                                            duration: 0.12,
                                            ease: "easeOut",
                                        }}
                                        className="absolute right-0 mt-1 w-60 overflow-hidden rounded-md border border-main bg-main shadow-2xl"
                                    >
                                        <div className="flex items-center justify-between border-b border-main px-3 py-1.5">
                                            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">
                                                {t("leftSidebar.filterStocks")}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedExchanges([]);
                                                    setSelectedIndexes([]);
                                                }}
                                                className={cn(
                                                    "inline-flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-semibold transition-colors",
                                                    hasActiveStockFilter
                                                        ? "text-sky-400 hover:bg-sky-500/10"
                                                        : "text-muted hover:bg-secondary",
                                                )}
                                                title={t("common.clear")}
                                            >
                                                <X size={10} />
                                                {t("common.clear")}
                                            </button>
                                        </div>

                                        <div className="p-2 space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="rounded border border-main bg-secondary/10 p-1.5">
                                                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted">
                                                        {t(
                                                            "leftSidebar.exchange",
                                                        )}
                                                    </div>
                                                    <div className="max-h-36 overflow-y-auto thin-scrollbar space-y-1 pr-0.5">
                                                        {stockFilterOptions
                                                            .exchanges
                                                            .length === 0 ? (
                                                            <div className="px-1 py-1 text-[9px] text-muted">
                                                                {t(
                                                                    "leftSidebar.noExchange",
                                                                )}
                                                            </div>
                                                        ) : (
                                                            stockFilterOptions.exchanges.map(
                                                                (exchange) => {
                                                                    const selected =
                                                                        selectedExchanges.includes(
                                                                            exchange,
                                                                        );
                                                                    return (
                                                                        <label
                                                                            key={`exchange-${exchange}`}
                                                                            className={cn(
                                                                                "flex cursor-pointer items-center gap-1.5 rounded px-1 py-1 text-[10px] transition-colors",
                                                                                selected
                                                                                    ? "bg-sky-500/10 text-sky-300"
                                                                                    : "text-main hover:bg-secondary",
                                                                            )}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={
                                                                                    selected
                                                                                }
                                                                                onChange={() =>
                                                                                    setSelectedExchanges(
                                                                                        (
                                                                                            prev,
                                                                                        ) =>
                                                                                            prev.includes(
                                                                                                exchange,
                                                                                            )
                                                                                                ? prev.filter(
                                                                                                      (
                                                                                                          value,
                                                                                                      ) =>
                                                                                                          value !==
                                                                                                          exchange,
                                                                                                  )
                                                                                                : [
                                                                                                      ...prev,
                                                                                                      exchange,
                                                                                                  ],
                                                                                    )
                                                                                }
                                                                                className="h-3 w-3 rounded border-main bg-secondary text-sky-400 focus:ring-sky-500/40"
                                                                            />
                                                                            <span className="truncate">
                                                                                {
                                                                                    exchange
                                                                                }
                                                                            </span>
                                                                        </label>
                                                                    );
                                                                },
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="rounded border border-main bg-secondary/10 p-1.5">
                                                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted">
                                                        {t("leftSidebar.index")}
                                                    </div>
                                                    <div className="max-h-36 overflow-y-auto thin-scrollbar space-y-1 pr-0.5">
                                                        {stockFilterOptions
                                                            .indexes.length ===
                                                        0 ? (
                                                            <div className="px-1 py-1 text-[9px] text-muted">
                                                                {t(
                                                                    "leftSidebar.noIndex",
                                                                )}
                                                            </div>
                                                        ) : (
                                                            stockFilterOptions.indexes.map(
                                                                (indexName) => {
                                                                    const selected =
                                                                        selectedIndexes.includes(
                                                                            indexName,
                                                                        );
                                                                    return (
                                                                        <label
                                                                            key={`index-${indexName}`}
                                                                            className={cn(
                                                                                "flex cursor-pointer items-center gap-1.5 rounded px-1 py-1 text-[10px] transition-colors",
                                                                                selected
                                                                                    ? "bg-sky-500/10 text-sky-300"
                                                                                    : "text-main hover:bg-secondary",
                                                                            )}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={
                                                                                    selected
                                                                                }
                                                                                onChange={() =>
                                                                                    setSelectedIndexes(
                                                                                        (
                                                                                            prev,
                                                                                        ) =>
                                                                                            prev.includes(
                                                                                                indexName,
                                                                                            )
                                                                                                ? prev.filter(
                                                                                                      (
                                                                                                          value,
                                                                                                      ) =>
                                                                                                          value !==
                                                                                                          indexName,
                                                                                                  )
                                                                                                : [
                                                                                                      ...prev,
                                                                                                      indexName,
                                                                                                  ],
                                                                                    )
                                                                                }
                                                                                className="h-3 w-3 rounded border-main bg-secondary text-sky-400 focus:ring-sky-500/40"
                                                                            />
                                                                            <span className="truncate">
                                                                                {
                                                                                    indexName
                                                                                }
                                                                            </span>
                                                                        </label>
                                                                    );
                                                                },
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {(selectedExchanges.length > 0 ||
                                                selectedIndexes.length > 0) && (
                                                <div className="rounded border border-main bg-secondary/10 p-1.5">
                                                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted">
                                                        {t("common.selected")}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {selectedExchanges.map(
                                                            (exchange) => (
                                                                <button
                                                                    key={`chip-exchange-${exchange}`}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedExchanges(
                                                                            (
                                                                                prev,
                                                                            ) =>
                                                                                prev.filter(
                                                                                    (
                                                                                        value,
                                                                                    ) =>
                                                                                        value !==
                                                                                        exchange,
                                                                                ),
                                                                        )
                                                                    }
                                                                    className="inline-flex items-center gap-1 rounded border border-sky-500/35 bg-sky-500/10 px-1.5 py-1 text-[9px] font-semibold text-sky-400"
                                                                    title={t(
                                                                        "leftSidebar.removeExchange",
                                                                        {
                                                                            value: exchange,
                                                                        },
                                                                    )}
                                                                >
                                                                    {exchange}
                                                                    <X
                                                                        size={9}
                                                                    />
                                                                </button>
                                                            ),
                                                        )}
                                                        {selectedIndexes.map(
                                                            (indexName) => (
                                                                <button
                                                                    key={`chip-index-${indexName}`}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedIndexes(
                                                                            (
                                                                                prev,
                                                                            ) =>
                                                                                prev.filter(
                                                                                    (
                                                                                        value,
                                                                                    ) =>
                                                                                        value !==
                                                                                        indexName,
                                                                                ),
                                                                        )
                                                                    }
                                                                    className="inline-flex items-center gap-1 rounded border border-sky-500/35 bg-sky-500/10 px-1.5 py-1 text-[9px] font-semibold text-sky-400"
                                                                    title={t(
                                                                        "leftSidebar.removeIndex",
                                                                        {
                                                                            value: indexName,
                                                                        },
                                                                    )}
                                                                >
                                                                    {indexName}
                                                                    <X
                                                                        size={9}
                                                                    />
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                    {universe === "coin" && (
                        <div
                            ref={coinFilterRef}
                            className="absolute right-1 top-1/2 -translate-y-1/2 z-20"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setCoinFilterOpen((prev) => !prev)
                                }
                                className={cn(
                                    "inline-flex h-6 w-6 items-center justify-center rounded border transition-colors focus:outline-none focus:ring-1",
                                    hasActiveCoinFilter
                                        ? "border-sky-500/40 bg-sky-500/15 text-sky-400 focus:ring-sky-500/40"
                                        : "border-main bg-main text-muted hover:text-main focus:ring-accent/30",
                                )}
                                title={t("leftSidebar.filterTags")}
                                aria-label={t("leftSidebar.openCoinTagFilter")}
                            >
                                <Funnel size={11} />
                            </button>

                            <AnimatePresence>
                                {coinFilterOpen && (
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            y: 6,
                                            scale: 0.98,
                                        }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                        transition={{
                                            duration: 0.12,
                                            ease: "easeOut",
                                        }}
                                        className="absolute right-0 mt-1 w-60 overflow-hidden rounded-md border border-main bg-main shadow-2xl"
                                    >
                                        <div className="flex items-center justify-between border-b border-main px-3 py-1.5">
                                            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">
                                                {t("leftSidebar.filterTags")}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedCoinTags([])
                                                }
                                                className={cn(
                                                    "inline-flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-semibold transition-colors",
                                                    hasActiveCoinFilter
                                                        ? "text-sky-400 hover:bg-sky-500/10"
                                                        : "text-muted hover:bg-secondary",
                                                )}
                                                title={t("common.clear")}
                                            >
                                                <X size={10} />
                                                {t("common.clear")}
                                            </button>
                                        </div>

                                        <div className="p-2 space-y-2">
                                            <div className="rounded border border-main bg-secondary/10 p-1.5">
                                                <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted">
                                                    {t("leftSidebar.tags")}
                                                </div>
                                                <div className="max-h-48 overflow-y-auto thin-scrollbar space-y-1 pr-0.5">
                                                    {coinFilterOptions.length ===
                                                    0 ? (
                                                        <div className="px-1 py-1 text-[9px] text-muted">
                                                            {t(
                                                                "leftSidebar.noTags",
                                                            )}
                                                        </div>
                                                    ) : (
                                                        coinFilterOptions.map(
                                                            (tag) => {
                                                                const selected =
                                                                    selectedCoinTags.includes(
                                                                        tag,
                                                                    );
                                                                return (
                                                                    <label
                                                                        key={`coin-tag-${tag}`}
                                                                        className={cn(
                                                                            "flex cursor-pointer items-center gap-1.5 rounded px-1 py-1 text-[10px] transition-colors",
                                                                            selected
                                                                                ? "bg-sky-500/10 text-sky-300"
                                                                                : "text-main hover:bg-secondary",
                                                                        )}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={
                                                                                selected
                                                                            }
                                                                            onChange={() =>
                                                                                setSelectedCoinTags(
                                                                                    (
                                                                                        prev,
                                                                                    ) =>
                                                                                        prev.includes(
                                                                                            tag,
                                                                                        )
                                                                                            ? prev.filter(
                                                                                                  (
                                                                                                      value,
                                                                                                  ) =>
                                                                                                      value !==
                                                                                                      tag,
                                                                                              )
                                                                                            : [
                                                                                                  ...prev,
                                                                                                  tag,
                                                                                              ],
                                                                                )
                                                                            }
                                                                            className="h-3 w-3 rounded border-main bg-secondary text-sky-400 focus:ring-sky-500/40"
                                                                        />
                                                                        <span className="truncate">
                                                                            {
                                                                                tag
                                                                            }
                                                                        </span>
                                                                    </label>
                                                                );
                                                            },
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                            {selectedCoinTags.length > 0 && (
                                                <div className="rounded border border-main bg-secondary/10 p-1.5">
                                                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted">
                                                        {t("common.selected")}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {selectedCoinTags.map(
                                                            (tag) => (
                                                                <button
                                                                    key={`chip-coin-tag-${tag}`}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedCoinTags(
                                                                            (
                                                                                prev,
                                                                            ) =>
                                                                                prev.filter(
                                                                                    (
                                                                                        value,
                                                                                    ) =>
                                                                                        value !==
                                                                                        tag,
                                                                                ),
                                                                        )
                                                                    }
                                                                    className="inline-flex items-center gap-1 rounded border border-sky-500/35 bg-sky-500/10 px-1.5 py-1 text-[9px] font-semibold text-sky-400"
                                                                    title={t(
                                                                        "leftSidebar.removeTag",
                                                                        {
                                                                            value: tag,
                                                                        },
                                                                    )}
                                                                >
                                                                    {tag}
                                                                    <X
                                                                        size={9}
                                                                    />
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Column headers — "Price / 24h" is clickable to sort */}
            <div className="px-3 py-1.5 grid grid-cols-2 text-[9px] font-semibold text-muted uppercase tracking-wider border-b border-main bg-secondary/30 shrink-0">
                <span>{t("leftSidebar.symbol")}</span>
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        type="button"
                        onClick={() => setFavoriteOnly((prev) => !prev)}
                        className={cn(
                            "inline-flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors",
                            favoriteOnly
                                ? "border-amber-400/60 bg-amber-400/10 text-amber-500"
                                : "border-main text-muted hover:text-main hover:bg-secondary",
                        )}
                        title={t("ticker.favorite")}
                        aria-label={t("ticker.favorite")}
                    >
                        <Star size={9} className={cn(favoriteOnly && "fill-current")} />
                    </button>
                    <button
                        onClick={() => setSortMode(nextSortMode(sortMode))}
                        className="flex items-center justify-end gap-1 hover:text-main transition-colors"
                        title={
                            sortMode === "volume"
                                ? t("leftSidebar.sortChangeDesc")
                                : sortMode === "change_desc"
                                  ? t("leftSidebar.sortChangeAsc")
                                  : t("leftSidebar.sortVolume")
                        }
                    >
                        {t("leftSidebar.price24h")}
                        <SortIcon mode={sortMode} />
                    </button>
                </div>
            </div>

            {/* Coin list */}
            <div
                ref={listRef}
                onScroll={handleListScroll}
                className="flex-1 min-h-0 overflow-y-auto thin-scrollbar"
            >
                {assetsLoading ? (
                    <LeftSidebarSkeleton rows={18} />
                ) : displayAssets.length === 0 ? (
                    <div className="p-6 text-center text-muted text-[11px]">
                        {t("leftSidebar.noAssets")}
                    </div>
                ) : (
                    visibleAssets.map((asset) => (
                        <CoinRow
                            key={asset.id}
                            asset={asset}
                            isSelected={selectedSymbol === asset.id}
                            onClick={() => setSelectedSymbol(asset.id)}
                            isFavorite={isFavorite(asset.symbol)}
                            onToggleFavorite={() =>
                                void toggleFavorite(asset.symbol, universe)
                            }
                            stockToneClass={
                                universe === "stock"
                                    ? stockToneClassBySymbol[
                                          asset.symbol.trim().toUpperCase()
                                      ]
                                    : undefined
                            }
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
                <div style={panelStyle} className={panelShellClass}>
                    {sidebarBody}
                </div>
            ) : (
                <motion.div
                    initial={false}
                    animate={{ width, opacity: 1 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    style={panelStyle}
                    className={panelShellClass}
                >
                    {sidebarBody}
                </motion.div>
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
        </div>
    );
};
