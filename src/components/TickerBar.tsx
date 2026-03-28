"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { useMarket } from "../context/MarketContext";
import { TokenAvatar } from "./TokenAvatar";
import { Check, Settings2, Wifi } from "lucide-react";
import type { Asset } from "../services/binanceService";

type TickerMode = "hot" | "gainers" | "favorites";

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

const modeMeta: Record<
    TickerMode,
    { label: string; description: string; implemented: boolean }
> = {
    hot: {
        label: "Asset hot",
        description: "Ưu tiên các tài sản có volume giao dịch cao nhất.",
        implemented: true,
    },
    gainers: {
        label: "Top gainers",
        description: "Ưu tiên các tài sản tăng giá mạnh nhất trong 24h.",
        implemented: true,
    },
    favorites: {
        label: "Favorites",
        description: "Sẽ hiện thực ở bước tiếp theo.",
        implemented: false,
    },
};

export const TickerBar = () => {
    const {
        assets,
        setSelectedSymbol,
        marketType,
        spotStreamStatus,
        futuresStreamStatus,
        lastSpotStreamUpdateAt,
        lastFuturesStreamUpdateAt,
        isMockUniverse,
    } = useMarket();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [tickerMode, setTickerMode] = useState<TickerMode>("hot");
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [isOnline, setIsOnline] = useState(
        () => (typeof navigator === "undefined" ? true : navigator.onLine),
    );
    const [networkQuality, setNetworkQuality] = useState<
        "good" | "weak" | "offline"
    >("good");
    const [stableOrderIds, setStableOrderIds] = useState<string[]>([]);
    const settingsRef = useRef<HTMLDivElement>(null);
    const streamStatus =
        marketType === "futures" ? futuresStreamStatus : spotStreamStatus;
    const lastUpdateAt =
        marketType === "futures"
            ? lastFuturesStreamUpdateAt
            : lastSpotStreamUpdateAt;

    useEffect(() => {
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

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
            return [];
        }

        return [...assets].sort((a, b) => b.quoteVolumeRaw - a.quoteVolumeRaw);
    }, [assets, tickerMode]);

    // Keep ticker order stable for smooth marquee. Re-rank in short intervals
    // instead of every websocket tick to avoid visual "jump back" glitches.
    useEffect(() => {
        const topIds = rankedAssets.slice(0, 140).map((asset) => asset.id);
        setStableOrderIds(topIds);
    }, [tickerMode, marketType]);

    useEffect(() => {
        const rebalance = () => {
            const topIds = rankedAssets.slice(0, 140).map((asset) => asset.id);
            setStableOrderIds(topIds);
        };
        rebalance();
        const id = setInterval(rebalance, 8000);
        return () => clearInterval(id);
    }, [rankedAssets]);

    const assetById = useMemo(
        () => new Map(assets.map((asset) => [asset.id, asset])),
        [assets],
    );

    const displayAssets = useMemo<Asset[]>(() => {
        const ordered = stableOrderIds
            .map((id) => assetById.get(id))
            .filter((asset): asset is Asset => Boolean(asset));
        if (ordered.length) return ordered;
        return rankedAssets.slice(0, 140);
    }, [assetById, rankedAssets, stableOrderIds]);

    if (assets.length === 0) return null;

    const items = [...displayAssets, ...displayAssets];
    const durationSeconds = Math.min(
        Math.max(displayAssets.length * 1.6, 180),
        720,
    );
    const activeMode = modeMeta[tickerMode];
    const staleMs =
        typeof lastUpdateAt === "number" ? Math.max(0, nowMs - lastUpdateAt) : null;
    const isLikelyLive =
        streamStatus === "connected" &&
        staleMs !== null &&
        staleMs < 10_000 &&
        isOnline;
    const statusLabel = !isOnline
        ? "Offline"
        : isMockUniverse
          ? "Mock feed"
        : networkQuality === "weak"
          ? "Weak network"
          : isLikelyLive
            ? "Stable"
            : streamStatus === "connecting"
              ? "Connecting"
              : streamStatus === "error"
                ? "Stream error"
                : streamStatus === "connected"
                  ? "Stale"
                  : "Reconnecting";
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
        <div className="relative h-8 border-t border-main bg-secondary/40 flex items-center shrink-0">
            <div
                ref={settingsRef}
                className="relative flex items-center px-2 border-r border-main h-full shrink-0 gap-2"
            >
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
                    <span className="text-[9px] text-muted tabular-nums">
                        {lastUpdateAt
                            ? new Date(lastUpdateAt).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                              })
                            : "--:--:--"}
                    </span>
                </div>

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
                    aria-label="Mo cai dat ticker"
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
                                Ticker Settings
                            </div>
                            <div className="text-[10px] text-muted mt-0.5">
                                Chọn loại asset hiển thị trên bottom bar.
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
                                                        Soon
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
                    <div
                        className="ticker-track items-center gap-0"
                        style={{ animationDuration: `${durationSeconds}s` }}
                    >
                        {items.map((asset, i) => (
                            <button
                                key={`${asset.id}-${i}`}
                                onClick={() => setSelectedSymbol(asset.id)}
                                className="flex items-center space-x-1.5 px-4 h-8 hover:bg-secondary/80 transition-colors border-r border-main last:border-r-0 shrink-0"
                            >
                                <TokenAvatar
                                    symbol={asset.symbol}
                                    logoUrl={asset.logoUrl}
                                    size={14}
                                />
                                <span className="text-[10px] font-semibold whitespace-nowrap">
                                    {asset.symbol}
                                    <span className="text-muted font-normal">
                                        /USDT
                                    </span>
                                </span>
                                <span
                                    className={cn(
                                        "text-[10px] font-bold tabular-nums w-[6px] text-right",
                                        asset.changePercent >= 0
                                            ? "text-emerald-500"
                                            : "text-rose-500",
                                    )}
                                >
                                    {asset.changePercent >= 0 ? "+" : ""}
                                    {asset.changePercent.toFixed(2)}%
                                </span>
                                <span className="text-[10px] font-mono tabular-nums text-muted whitespace-nowrap w-[78px] text-right">
                                    {priceFmt(asset.price)}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex items-center px-4 text-[10px] text-muted">
                        Danh sach asset yeu thich se duoc bo sung o buoc tiep
                        theo.
                    </div>
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
