"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { useMarket } from "../context/MarketContext";
import { TokenAvatar } from "./TokenAvatar";
import { Check, Settings2, Star, Wifi } from "lucide-react";
import type { Asset } from "../services/binanceService";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "../context/I18nContext";
import { useUserFavorites } from "../hooks/useUserFavorites";

type TickerMode = "hot" | "gainers" | "favorites";
const TICKER_MAX_ITEMS = 96;

const priceFmt = (v: number) =>
    v < 0.001
        ? v.toFixed(6)
        : v < 0.01
          ? v.toFixed(5)
          : v < 1
            ? v.toFixed(4)
            : v < 10000
              ? v.toFixed(2)
              : v.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });

export const TickerBar = () => {
    const { t } = useI18n();
    const router = useRouter();
    const pathname = usePathname();
    const {
        assets,
        selectedSymbol,
        setSelectedSymbol,
        universe,
        marketType,
        isLoading,
        isFuturesLoading,
        spotStreamStatus,
        futuresStreamStatus,
        lastSpotStreamUpdateAt,
        lastFuturesStreamUpdateAt,
    } = useMarket();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [tickerMode, setTickerMode] = useState<TickerMode>("hot");
    const [isOnline, setIsOnline] = useState(true);
    const [networkQuality, setNetworkQuality] = useState<
        "good" | "weak" | "offline"
    >("good");
    const [stableOrderIds, setStableOrderIds] = useState<string[]>([]);
    const { isFavorite, toggleFavorite } = useUserFavorites();
    const modeMeta: Record<
        TickerMode,
        { label: string; description: string; implemented: boolean }
    > = {
        hot: {
            label: t("ticker.hotLabel"),
            description: t("ticker.hotDescription"),
            implemented: true,
        },
        gainers: {
            label: t("ticker.gainersLabel"),
            description: t("ticker.gainersDescription"),
            implemented: true,
        },
        favorites: {
            label: t("ticker.favoritesLabel"),
            description: t("ticker.favoritesDescription"),
            implemented: true,
        },
    };
    const modeKeyRef = useRef<string>(`${tickerMode}:${marketType}`);
    const settingsRef = useRef<HTMLDivElement>(null);
    const streamStatus =
        marketType === "futures" ? futuresStreamStatus : spotStreamStatus;
    const lastUpdateAt =
        marketType === "futures"
            ? lastFuturesStreamUpdateAt
            : lastSpotStreamUpdateAt;
    const isBootstrapLoading =
        marketType === "futures" ? isFuturesLoading : isLoading;

    useEffect(() => {
        const evaluateQuality = () => {
            const online = navigator.onLine;
            setIsOnline(online);
            if (!online) {
                setNetworkQuality("offline");
                return;
            }

            const connection = (
                navigator as Navigator & {
                    connection?: {
                        effectiveType?: string;
                        downlink?: number;
                        rtt?: number;
                        saveData?: boolean;
                    };
                }
            ).connection;

            if (!connection) {
                setNetworkQuality("good");
                return;
            }

            const isWeak =
                connection.saveData === true ||
                (typeof connection.downlink === "number" &&
                    connection.downlink > 0 &&
                    connection.downlink < 1.5) ||
                (typeof connection.rtt === "number" && connection.rtt > 350) ||
                connection.effectiveType === "2g" ||
                connection.effectiveType === "slow-2g";

            setNetworkQuality(isWeak ? "weak" : "good");
        };

        evaluateQuality();
        window.addEventListener("online", evaluateQuality);
        window.addEventListener("offline", evaluateQuality);
        const connection = (
            navigator as Navigator & {
                connection?: EventTarget & {
                    addEventListener?: (
                        type: "change",
                        listener: () => void,
                    ) => void;
                    removeEventListener?: (
                        type: "change",
                        listener: () => void,
                    ) => void;
                };
            }
        ).connection;
        connection?.addEventListener?.("change", evaluateQuality);

        return () => {
            window.removeEventListener("online", evaluateQuality);
            window.removeEventListener("offline", evaluateQuality);
            connection?.removeEventListener?.("change", evaluateQuality);
        };
    }, []);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (
                settingsRef.current &&
                !settingsRef.current.contains(event.target as Node)
            ) {
                setIsSettingsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsSettingsOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const rankedAssets = useMemo(() => {
        if (tickerMode === "gainers") {
            const positiveAssets = assets
                .filter((asset) => asset.changePercent > 0)
                .sort((a, b) => b.changePercent - a.changePercent);
            return positiveAssets.length > 0
                ? positiveAssets
                : [...assets].sort((a, b) => b.changePercent - a.changePercent);
        }

        if (tickerMode === "favorites") {
            const favoriteOnly = assets.filter((asset) => isFavorite(asset.id));
            return favoriteOnly;
        }

        return [...assets].sort((a, b) => b.quoteVolumeRaw - a.quoteVolumeRaw);
    }, [assets, isFavorite, tickerMode]);

    // Keep ticker order stable across websocket ticks to avoid marquee jumps.
    useEffect(() => {
        const modeKey = `${tickerMode}:${marketType}`;
        const topIds = rankedAssets
            .slice(0, TICKER_MAX_ITEMS)
            .map((asset) => asset.id);
        setStableOrderIds((prev) => {
            if (!topIds.length) return [];

            const modeChanged = modeKeyRef.current !== modeKey;
            modeKeyRef.current = modeKey;
            if (modeChanged || prev.length === 0) return topIds;

            const topSet = new Set(topIds);
            const kept = prev.filter((id) => topSet.has(id));
            const seen = new Set(kept);
            for (const id of topIds) {
                if (!seen.has(id)) {
                    kept.push(id);
                    seen.add(id);
                }
            }
            const next = kept.slice(0, TICKER_MAX_ITEMS);
            if (
                next.length === prev.length &&
                next.every((id, idx) => id === prev[idx])
            ) {
                return prev;
            }
            return next;
        });
    }, [rankedAssets, tickerMode, marketType]);

    const assetById = useMemo(
        () => new Map(assets.map((asset) => [asset.id, asset])),
        [assets],
    );

    const displayAssets = useMemo<Asset[]>(() => {
        const ordered = stableOrderIds
            .map((id) => assetById.get(id))
            .filter((asset): asset is Asset => Boolean(asset));
        if (ordered.length) return ordered;
        return rankedAssets.slice(0, TICKER_MAX_ITEMS);
    }, [assetById, rankedAssets, stableOrderIds]);
    const handleSelect = useCallback((id: string) => {
        setSelectedSymbol(id);
        if (pathname !== "/") {
            router.push("/");
        }
    }, [pathname, router, setSelectedSymbol]);

    const durationSeconds = Math.min(
        Math.max(displayAssets.length * 1.6, 180),
        720,
    );
    const activeMode = modeMeta[tickerMode];

    return (
        <div className="relative h-8 border-t border-main bg-secondary/40 flex items-center shrink-0">
            <div
                ref={settingsRef}
                className="relative flex items-center px-2 border-r border-main h-full shrink-0 gap-2"
            >
                <TickerStatusBadge
                    isOnline={isOnline}
                    networkQuality={networkQuality}
                    streamStatus={streamStatus}
                    lastUpdateAt={lastUpdateAt}
                    universe={universe}
                />

                <div className="w-px h-3 bg-main" />
                <button
                    type="button"
                    onClick={() => void toggleFavorite(selectedSymbol, universe)}
                    className={cn(
                        "flex items-center gap-1 rounded-md border px-2 h-6 transition-colors",
                        isFavorite(selectedSymbol)
                            ? "border-amber-400/70 bg-amber-400/10 text-amber-500"
                            : "border-main text-muted hover:text-main hover:bg-secondary",
                    )}
                    aria-label={t("ticker.toggleFavorite")}
                    title={t("ticker.toggleFavorite")}
                >
                    <Star size={11} className={cn(isFavorite(selectedSymbol) && "fill-current")} />
                    <span className="text-[9px] font-medium whitespace-nowrap">
                        {t("ticker.favorite")}
                    </span>
                </button>

                <div className="w-px h-3 bg-main" />

                <button
                    type="button"
                    onClick={() => setIsSettingsOpen((prev) => !prev)}
                    className={cn(
                        "flex items-center gap-1 rounded-md border px-2 h-6 transition-colors",
                        isSettingsOpen
                            ? "border-accent/40 bg-accent/10 text-main"
                            : "border-main text-muted hover:text-main hover:bg-secondary",
                    )}
                    aria-label={t("ticker.openSettings")}
                    aria-expanded={isSettingsOpen}
                >
                    <Settings2 size={12} />
                    <span className="text-[9px] font-medium whitespace-nowrap">
                        {activeMode.label}
                    </span>
                </button>

                {isSettingsOpen && (
                    <div className="absolute left-2 bottom-full mb-2 w-64 rounded-lg border border-main bg-main shadow-2xl p-2 z-50">
                        <div className="px-2 py-1.5 border-b border-main">
                            <div className="text-[11px] font-semibold">
                                {t("ticker.settingsTitle")}
                            </div>
                            <div className="text-[10px] text-muted mt-0.5">
                                {t("ticker.settingsDesc")}
                            </div>
                        </div>

                        <div className="pt-1">
                            {(
                                Object.entries(modeMeta) as [
                                    TickerMode,
                                    (typeof modeMeta)[TickerMode],
                                ][]
                            ).map(([mode, meta]) => {
                                const isActive = tickerMode === mode;
                                const disabled = !meta.implemented;

                                return (
                                    <button
                                        key={mode}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => {
                                            if (disabled) return;
                                            setTickerMode(mode);
                                            setIsSettingsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-start gap-2 rounded-md px-2 py-2 text-left transition-colors",
                                            disabled
                                                ? "cursor-not-allowed opacity-50"
                                                : isActive
                                                  ? "bg-accent/10"
                                                  : "hover:bg-secondary",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border shrink-0",
                                                isActive
                                                    ? "border-accent bg-accent/15 text-accent"
                                                    : "border-main text-transparent",
                                            )}
                                        >
                                            <Check size={10} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-semibold">
                                                    {meta.label}
                                                </span>
                                                {disabled && (
                                                    <span className="text-[8px] uppercase tracking-wide px-1 py-px rounded border border-main text-muted">
                                                        {t("ticker.soon")}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="block text-[9px] text-muted mt-0.5">
                                                {meta.description}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-hidden ticker-wrapper cursor-default select-none">
                {displayAssets.length > 0 ? (
                    <TickerMarquee
                        assets={displayAssets}
                        universe={universe}
                        durationSeconds={durationSeconds}
                        onSelect={handleSelect}
                    />
                ) : tickerMode === "favorites" &&
                  assets.length > 0 &&
                  !isBootstrapLoading ? (
                    <div className="h-full flex items-center px-4 text-[10px] text-muted">
                        {t("ticker.favoritesEmpty")}
                    </div>
                ) : (
                    <TickerMarqueeSkeleton />
                )}
            </div>

            <div className="flex items-center px-3 border-l border-main h-full shrink-0">
                <a
                    href="https://www.tradingview.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-muted/60 hover:text-muted transition-colors whitespace-nowrap"
                >
                    Charts by TradingView
                </a>
            </div>
        </div>
    );
};

const TickerStatusBadge = React.memo(function TickerStatusBadge({
    isOnline,
    networkQuality,
    streamStatus,
    lastUpdateAt,
    universe,
}: {
    isOnline: boolean;
    networkQuality: "good" | "weak" | "offline";
    streamStatus: "connecting" | "connected" | "disconnected" | "error";
    lastUpdateAt: number | null;
    universe: "coin" | "stock";
}) {
    const { t } = useI18n();
    const [nowMs, setNowMs] = useState(0);

    useEffect(() => {
        setNowMs(Date.now());
        const id = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const staleMs =
        typeof lastUpdateAt === "number" ? Math.max(0, nowMs - lastUpdateAt) : null;
    const isLikelyLive =
        streamStatus === "connected" &&
        isOnline &&
        (universe === "stock" ||
            (staleMs !== null && staleMs < 10_000));
    const statusLabel = !isOnline
        ? t("ticker.offline")
        : networkQuality === "weak"
          ? t("ticker.weakNetwork")
          : isLikelyLive
            ? t("ticker.stable")
            : streamStatus === "connecting"
              ? t("ticker.connecting")
              : streamStatus === "error"
                ? t("ticker.streamError")
                : streamStatus === "connected"
                  ? t("ticker.stale")
                  : t("ticker.reconnecting");
    const statusTone = !isOnline
        ? "text-rose-500"
        : networkQuality === "weak"
          ? "text-amber-400"
          : isLikelyLive
            ? "text-emerald-500"
            : streamStatus === "connecting" || streamStatus === "connected"
              ? "text-amber-400"
              : "text-rose-500";

    return (
        <div className="flex items-center gap-1.5">
            <Wifi
                size={11}
                className={statusTone}
            />
            <span
                className={cn("text-[10px] font-semibold whitespace-nowrap", statusTone)}
            >
                {statusLabel}
            </span>
            <span
                className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    !isOnline
                        ? "bg-rose-500"
                        : isLikelyLive
                        ? "bg-emerald-500"
                        : "bg-amber-400 animate-pulse",
                )}
            />
        </div>
    );
});

const TickerMarquee = React.memo(function TickerMarquee({
    assets,
    universe,
    durationSeconds,
    onSelect,
}: {
    assets: Asset[];
    universe: "coin" | "stock";
    durationSeconds: number;
    onSelect: (id: string) => void;
}) {
    const items = useMemo(() => {
        const out: Array<{ key: string; asset: Asset }> = [];
        for (let copy = 0; copy < 2; copy += 1) {
            for (const asset of assets) {
                out.push({
                    key: `${copy}:${asset.id}`,
                    asset,
                });
            }
        }
        return out;
    }, [assets]);

    return (
        <div
            className="ticker-track items-center gap-0"
            style={{ animationDuration: `${durationSeconds}s` }}
        >
            {items.map(({ key, asset }) => (
                <button
                    key={key}
                    onClick={() => onSelect(asset.id)}
                    className="flex items-center space-x-1 px-2.5 h-8 hover:bg-secondary/80 transition-colors border-r border-main last:border-r-0 shrink-0 w-[210px]"
                >
                    <TokenAvatar
                        symbol={asset.symbol}
                        logoUrl={asset.logoUrl}
                        size={14}
                    />
                    <span className="text-[10px] font-semibold whitespace-nowrap w-[72px]">
                        {asset.symbol}
                        <span className="text-muted font-normal">
                            /{universe === "stock" ? "VND" : "USDT"}
                        </span>
                    </span>
                    <span
                        className={cn(
                            "text-[10px] font-bold tabular-nums w-[48px] text-right",
                            asset.changePercent >= 0
                                ? "text-emerald-500"
                                : "text-rose-500",
                        )}
                    >
                        {asset.changePercent >= 0 ? "+" : ""}
                        {asset.changePercent.toFixed(2)}%
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-muted whitespace-nowrap w-[68px] text-right">
                        {priceFmt(asset.price)}
                    </span>
                </button>
            ))}
        </div>
    );
});

const TickerMarqueeSkeleton = React.memo(function TickerMarqueeSkeleton() {
    return (
        <div className="flex h-full items-center gap-0 px-1">
            {Array.from({ length: 7 }).map((_, idx) => (
                <div
                    key={`ticker-skeleton-${idx}`}
                    className="flex items-center space-x-1 px-2.5 h-8 border-r border-main shrink-0 w-[210px]"
                >
                    <span className="h-3.5 w-3.5 rounded-full bg-secondary animate-pulse shrink-0" />
                    <span className="h-2.5 w-16 rounded bg-secondary animate-pulse shrink-0" />
                    <span className="h-2.5 w-10 rounded bg-secondary/80 animate-pulse ml-auto shrink-0" />
                    <span className="h-2.5 w-12 rounded bg-secondary/80 animate-pulse shrink-0" />
                </div>
            ))}
        </div>
    );
});
