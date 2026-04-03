"use client";

import React, {
    useState,
    useCallback,
    useRef,
    useEffect,
    useMemo,
} from "react";
import type { IChartApi, UTCTimestamp, LogicalRange } from "lightweight-charts";
import { useMarket } from "../context/MarketContext";
import {
    useChartData,
    CHART_INTERVALS,
    type Indicator,
} from "../hooks/useChartData";
import { useFuturesPremiumIndex } from "../hooks/useFuturesPremiumIndex";
import { cn } from "../lib/utils";
import {
    TrendingUp,
    TrendingDown,
    BarChart2,
    LineChart,
    Info,
    Activity,
    ChevronsRight,
    Loader2,
    Waves,
    Zap,
    Clock,
    AlertTriangle,
} from "lucide-react";
import { FlowPanel } from "./FlowPanel";
import { TokenAvatar } from "./TokenAvatar";
import { FuturesLiquidationPanel } from "./FuturesLiquidationPanel";

// ─── Price formatter ─────────────────────────────────────────────────────────
const priceFmt = (v: number) => {
    if (!v || isNaN(v)) return "—";
    if (v < 0.00001) return v.toFixed(8);
    if (v < 0.001) return v.toFixed(6);
    if (v < 0.01) return v.toFixed(5);
    if (v < 1) return v.toFixed(4);
    if (v < 100) return v.toFixed(3);
    return v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const volFmt = (v: number) => {
    if (!v) return "—";
    return v >= 1_000_000
        ? `${(v / 1_000_000).toFixed(2)}M`
        : `${(v / 1_000).toFixed(0)}K`;
};

const compactNumberFmt = (v: number) => {
    if (!Number.isFinite(v) || v <= 0) return "—";
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
    return v.toFixed(2);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function msToCountdown(ms: number): string {
    if (ms <= 0) return "00:00:00";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

// ─── Coin Info Panel ──────────────────────────────────────────────────────────
const CoinInfoPanel = () => {
    const { assets, selectedSymbol, marketType, universe } = useMarket();
    const asset = assets.find((a) => a.id === selectedSymbol);
    const {
        data: premiumData,
        isLoading: premiumLoading,
        fundingRatePct,
        msToNextFunding,
    } = useFuturesPremiumIndex(selectedSymbol, marketType);

    // Countdown ticker for next funding time
    const [countdown, setCountdown] = useState<string>("—");
    useEffect(() => {
        if (marketType !== "futures" || !premiumData) {
            setCountdown("—");
            return;
        }
        const tick = () =>
            setCountdown(
                msToCountdown(premiumData.nextFundingTime - Date.now()),
            );
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [marketType, premiumData]);

    if (!asset)
        return (
            <div className="flex-1 flex items-center justify-center text-muted text-[12px]">
                Loading...
            </div>
        );

    const isFutures = marketType === "futures";
    const isStock = universe === "stock";
    const fundingRateNum = premiumData
        ? parseFloat(premiumData.lastFundingRate)
        : 0;

    const spotRows = [
        {
            label: "Last Price",
            value: isStock
                ? priceFmt(asset.price)
                : `$${priceFmt(asset.price)}`,
        },
        {
            label: "24h Change",
            value: `${asset.changePercent >= 0 ? "+" : ""}${asset.changePercent.toFixed(2)}%`,
            color:
                asset.changePercent >= 0 ? "text-emerald-500" : "text-rose-500",
        },
        {
            label: "24h High",
            value: isStock
                ? priceFmt(asset.high24h ?? 0)
                : `$${priceFmt(asset.high24h ?? 0)}`,
        },
        {
            label: "24h Low",
            value: isStock
                ? priceFmt(asset.low24h ?? 0)
                : `$${priceFmt(asset.low24h ?? 0)}`,
        },
        { label: "24h Volume", value: asset.volume24h },
        { label: "Market Cap", value: asset.marketCap },
    ];
    const stockRows = [
        ...spotRows,
        { label: "Company", value: asset.stockProfile?.organName || "—" },
        {
            label: "Short Name",
            value: asset.stockProfile?.organShortName || "—",
        },
        { label: "Exchange", value: asset.stockProfile?.exchange || "—" },
        { label: "Sector", value: asset.stockProfile?.sector || "—" },
        { label: "Industry", value: asset.stockProfile?.industry || "—" },
        { label: "Group", value: asset.stockProfile?.group || "—" },
        { label: "Subgroup", value: asset.stockProfile?.subgroup || "—" },
        { label: "ICB", value: asset.stockProfile?.icbName || "—" },
        {
            label: "ICB Path",
            value: asset.stockProfile?.icbNamePath || "—",
        },
        {
            label: "Indices",
            value: asset.stockProfile?.indexMembership?.length
                ? asset.stockProfile.indexMembership.join(", ")
                : "—",
        },
    ];

    const futuresRows = [
        { label: "Last Price", value: `$${priceFmt(asset.price)}` },
        {
            label: "Mark Price",
            value: premiumLoading
                ? "..."
                : premiumData
                  ? `$${priceFmt(parseFloat(premiumData.markPrice))}`
                  : "—",
        },
        {
            label: "Index Price",
            value: premiumLoading
                ? "..."
                : premiumData
                  ? `$${priceFmt(parseFloat(premiumData.indexPrice))}`
                  : "—",
        },
        {
            label: "24h Change",
            value: `${asset.changePercent >= 0 ? "+" : ""}${asset.changePercent.toFixed(2)}%`,
            color:
                asset.changePercent >= 0 ? "text-emerald-500" : "text-rose-500",
        },
        { label: "24h High", value: `$${priceFmt(asset.high24h ?? 0)}` },
        { label: "24h Low", value: `$${priceFmt(asset.low24h ?? 0)}` },
        { label: "24h Volume", value: asset.volume24h },
        {
            label: "Funding Rate",
            value: premiumLoading ? "..." : (fundingRatePct ?? "—"),
            color: !premiumData
                ? undefined
                : fundingRateNum >= 0
                  ? "text-emerald-500"
                  : "text-rose-500",
            tooltip:
                "Funding rate (annualised ~3×/day). Positive = longs pay shorts.",
        },
        {
            label: "Next Funding",
            value: countdown,
        },
    ];

    const rows = isFutures
        ? futuresRows
        : universe === "stock"
          ? stockRows
          : spotRows;

    const marketBadge = isFutures
        ? {
              label: "PERP",
              bg: "bg-amber-400/15 text-amber-400 border border-amber-400/20",
              icon: Zap,
          }
        : null;

    return (
        <div className="flex-1 overflow-y-auto thin-scrollbar p-5 space-y-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-main">
                <TokenAvatar
                    symbol={asset.symbol}
                    logoUrl={asset.logoUrl}
                    size={40}
                />
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[15px]">
                            {asset.symbol}
                        </span>
                        {marketBadge && (
                            <span
                                className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5",
                                    marketBadge.bg,
                                )}
                            >
                                <marketBadge.icon size={9} />
                                {marketBadge.label}
                            </span>
                        )}
                    </div>
                    <div className="text-muted text-[11px]">
                        {asset.id} ·{" "}
                        {universe === "stock"
                            ? "VN Stock Feed"
                            : isFutures
                              ? "Binance Futures"
                              : "Binance"}
                    </div>
                </div>
                <div className="ml-auto shrink-0">
                    {asset.changePercent >= 0 ? (
                        <TrendingUp size={20} className="text-emerald-500" />
                    ) : (
                        <TrendingDown size={20} className="text-rose-500" />
                    )}
                </div>
            </div>

            <div className="rounded-lg border border-main overflow-hidden">
                {rows.map((row, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex items-center justify-between px-4 py-3",
                            i % 2 === 0 ? "bg-secondary/40" : "",
                        )}
                    >
                        <span className="text-[11px] text-muted flex items-center gap-1">
                            {row.label}
                            {"tooltip" in row && row.tooltip && (
                                <span title={row.tooltip as string}>
                                    <Info size={10} className="text-muted/50" />
                                </span>
                            )}
                        </span>
                        <span
                            className={cn(
                                "text-[12px] font-medium text-right max-w-[62%] break-words",
                                row.color ?? "",
                            )}
                        >
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Futures funding rate visual bar */}
            {isFutures && premiumData && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted flex items-center gap-1">
                            <Clock size={10} />
                            Đến kỳ thanh toán
                        </span>
                        <span className="font-mono text-main">{countdown}</span>
                    </div>
                    <div className="h-1 rounded-full bg-secondary overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                fundingRateNum >= 0
                                    ? "bg-emerald-500"
                                    : "bg-rose-500",
                            )}
                            style={{
                                width: `${Math.min(100, Math.abs(fundingRateNum) * 10000 * 5)}%`,
                            }}
                        />
                    </div>
                    <p className="text-[10px] text-muted leading-relaxed">
                        Funding rate{" "}
                        <strong
                            className={
                                fundingRateNum >= 0
                                    ? "text-emerald-500"
                                    : "text-rose-500"
                            }
                        >
                            {fundingRatePct}
                        </strong>
                        :&nbsp;
                        {fundingRateNum >= 0
                            ? "Longs đang trả shorts."
                            : "Shorts đang trả longs."}
                    </p>
                </div>
            )}

            <div className="space-y-1">
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    About {asset.symbol}
                </div>
                <p className="text-[12px] text-muted leading-relaxed">
                    {asset.symbol} là{" "}
                    {universe === "stock"
                        ? "một mã cổ phiếu được lấy từ nguồn dữ liệu thị trường Việt Nam."
                        : "tài sản kỹ thuật số giao dịch trên Binance."}{" "}
                    Dữ liệu{" "}
                    {universe === "stock"
                        ? "giá và khối lượng từ stock feed."
                        : `giá và khối lượng thời gian thực từ ${
                              isFutures
                                  ? "Binance Futures REST API"
                                  : "Binance REST API"
                          }.`}
                </p>
            </div>
        </div>
    );
};

// ─── Main Chart ───────────────────────────────────────────────────────────────
export const MainChart = () => {
    const { selectedSymbol, assets, marketType, universe } = useMarket();
    const {
        data,
        isLoading,
        isFetchingHistory,
        interval,
        setInterval,
        chartType,
        setChartType,
        activeIndicators,
        toggleIndicator,
        fetchHistory,
    } = useChartData(selectedSymbol, marketType);

    type ChartTab = "chart" | "info" | "flow" | "liquidation";
    const [activeTab, setActiveTab] = useState<ChartTab>("chart");
    const [isPanned, setIsPanned] = useState(false);

    const currentAsset = assets.find((a) => a.id === selectedSymbol);
    const isPositive = (currentAsset?.changePercent ?? 0) >= 0;
    const lastPoint = data[data.length - 1];
    const lastStablePointRef = useRef<typeof lastPoint>(undefined);
    useEffect(() => {
        if (lastPoint) {
            lastStablePointRef.current = lastPoint;
        }
    }, [lastPoint]);
    const displayedLastPoint = lastPoint ?? lastStablePointRef.current;
    const isFutures = marketType === "futures";

    const tabs = useMemo(
        () =>
            (isFutures
                ? (["chart", "info", "flow", "liquidation"] as const)
                : (["chart", "info", "flow"] as const)) as readonly ChartTab[],
        [isFutures],
    );
    const tabMeta: Record<
        ChartTab,
        {
            label: string;
            icon: React.ReactNode;
            activeClass: string;
            iconClass: string;
        }
    > = useMemo(
        () => ({
            chart: {
                label: "CHART",
                icon: <BarChart2 size={11} />,
                activeClass:
                    "border-blue-500/30 bg-blue-500/10 text-blue-400 border",
                iconClass: "text-blue-400",
            },
            info: {
                label: "INFO",
                icon: <Info size={11} />,
                activeClass:
                    "border-blue-500/30 bg-blue-500/10 text-blue-400 border",
                iconClass: "text-blue-400",
            },
            flow: {
                label: "FLOW",
                icon: <Waves size={11} />,
                activeClass:
                    "border-blue-500/30 bg-blue-500/10 text-blue-400 border",
                iconClass: "text-blue-400",
            },
            liquidation: {
                label: "LIQUIDATION",
                icon: <AlertTriangle size={11} />,
                activeClass:
                    "border-blue-500/30 bg-blue-500/10 text-blue-400 border",
                iconClass: "text-blue-400",
            },
        }),
        [],
    );

    useEffect(() => {
        if (!tabs.includes(activeTab)) {
            setActiveTab("chart");
        }
    }, [activeTab, tabs]);

    // ── Lightweight Charts module (loaded client-only) ──
    const lcRef = useRef<any>(null);
    const [lcLoaded, setLcLoaded] = useState(false);

    useEffect(() => {
        import("lightweight-charts").then((mod) => {
            lcRef.current = mod;
            setLcLoaded(true);
        });
    }, []);

    // ── Chart instance refs ──
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [chartReady, setChartReady] = useState(0);

    // ── Series refs ──
    const candleSeriesRef = useRef<any>(null);
    const areaSeriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);
    const ma7SeriesRef = useRef<any>(null);
    const ma25SeriesRef = useRef<any>(null);
    const ema99SeriesRef = useRef<any>(null);

    // ── Stable refs for event handlers ──
    const fetchHistoryRef = useRef(fetchHistory);
    useEffect(() => {
        fetchHistoryRef.current = fetchHistory;
    }, [fetchHistory]);

    const dataLenRef = useRef(0);
    useEffect(() => {
        dataLenRef.current = data.length;
    }, [data.length]);

    const legendRef = useRef<HTMLDivElement>(null);
    const isInitialFit = useRef(true);

    // ── Reset fit on symbol/interval change ──
    useEffect(() => {
        isInitialFit.current = true;
    }, [selectedSymbol, interval]);

    // ── Effect 1: Chart lifecycle ──
    useEffect(() => {
        const lc = lcRef.current;
        if (!lc || activeTab !== "chart" || !chartContainerRef.current) return;

        const container = chartContainerRef.current;
        const chart: IChartApi = lc.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: { type: lc.ColorType.Solid, color: "transparent" },
                textColor: "rgba(255, 255, 255, 0.4)",
                fontFamily:
                    "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace",
                fontSize: 10,
                attributionLogo: false,
            },
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.03)" },
                horzLines: { color: "rgba(255, 255, 255, 0.03)" },
            },
            crosshair: {
                mode: lc.CrosshairMode.Normal,
                vertLine: {
                    color: "rgba(255, 255, 255, 0.12)",
                    width: 1,
                    style: 3,
                    labelBackgroundColor: "rgba(0, 122, 255, 0.85)",
                },
                horzLine: {
                    color: "rgba(255, 255, 255, 0.12)",
                    width: 1,
                    style: 3,
                    labelBackgroundColor: "rgba(0, 122, 255, 0.85)",
                },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: { top: 0.06, bottom: 0.12 },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
                barSpacing: 8,
                minBarSpacing: 2,
                rightOffset: 5,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: false,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        chartRef.current = chart;
        isInitialFit.current = true;

        // ── Responsive resize ──
        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) {
                chart.applyOptions({ width, height });
            }
        });
        ro.observe(container);

        // ── Auto-fetch history when scrolling near left edge ──
        let historyThrottle = false;
        chart
            .timeScale()
            .subscribeVisibleLogicalRangeChange(
                (range: LogicalRange | null) => {
                    if (!range) return;
                    const atEnd = range.to >= dataLenRef.current - 3;
                    setIsPanned(!atEnd);
                    if (range.from < 10 && !historyThrottle) {
                        historyThrottle = true;
                        fetchHistoryRef.current();
                        setTimeout(() => {
                            historyThrottle = false;
                        }, 2000);
                    }
                },
            );

        // ── Crosshair → floating legend (direct DOM, zero React re-renders) ──
        chart.subscribeCrosshairMove((param: any) => {
            if (!legendRef.current) return;

            if (
                !param.time ||
                !param.point ||
                param.point.x < 0 ||
                param.point.y < 0
            ) {
                legendRef.current.style.opacity = "0";
                return;
            }

            legendRef.current.style.opacity = "1";

            let html = "";
            const upC = "#10b981";
            const dnC = "#f43f5e";

            const cd = candleSeriesRef.current
                ? (param.seriesData.get(candleSeriesRef.current) as any)
                : null;
            const ad = areaSeriesRef.current
                ? (param.seriesData.get(areaSeriesRef.current) as any)
                : null;
            const vd = volumeSeriesRef.current
                ? (param.seriesData.get(volumeSeriesRef.current) as any)
                : null;

            if (cd) {
                const isUp = cd.close >= cd.open;
                const c = isUp ? upC : dnC;
                html += `<span style="color:rgba(255,255,255,0.35)">O</span><span style="color:${c}" class="font-mono"> ${priceFmt(cd.open)}</span> `;
                html += `<span style="color:rgba(255,255,255,0.35)">H</span><span style="color:${upC}" class="font-mono"> ${priceFmt(cd.high)}</span> `;
                html += `<span style="color:rgba(255,255,255,0.35)">L</span><span style="color:${dnC}" class="font-mono"> ${priceFmt(cd.low)}</span> `;
                html += `<span style="color:rgba(255,255,255,0.35)">C</span><span style="color:${c}" class="font-mono"> ${priceFmt(cd.close)}</span> `;
            } else if (ad) {
                html += `<span style="color:rgba(255,255,255,0.35)">Price</span><span style="color:#007AFF" class="font-mono"> ${priceFmt(ad.value)}</span> `;
            }

            if (vd?.value) {
                html += `<span style="color:rgba(255,255,255,0.35)">Vol</span><span style="color:#60a5fa" class="font-mono"> ${volFmt(vd.value)}</span> `;
            }

            const m7 = ma7SeriesRef.current
                ? (param.seriesData.get(ma7SeriesRef.current) as any)
                : null;
            const m25 = ma25SeriesRef.current
                ? (param.seriesData.get(ma25SeriesRef.current) as any)
                : null;
            const e99 = ema99SeriesRef.current
                ? (param.seriesData.get(ema99SeriesRef.current) as any)
                : null;

            if (m7?.value != null)
                html += `<span style="color:#f59e0b" class="font-mono">MA7 ${priceFmt(m7.value)}</span> `;
            if (m25?.value != null)
                html += `<span style="color:#a78bfa" class="font-mono">MA25 ${priceFmt(m25.value)}</span> `;
            if (e99?.value != null)
                html += `<span style="color:#38bdf8" class="font-mono">EMA99 ${priceFmt(e99.value)}</span>`;

            legendRef.current.innerHTML = html;
        });

        setChartReady((prev) => prev + 1);

        return () => {
            ro.disconnect();
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            areaSeriesRef.current = null;
            volumeSeriesRef.current = null;
            ma7SeriesRef.current = null;
            ma25SeriesRef.current = null;
            ema99SeriesRef.current = null;
        };
    }, [lcLoaded, activeTab]);

    // ── Effect 2: Main series + Volume ──
    useEffect(() => {
        const lc = lcRef.current;
        const chart = chartRef.current;
        if (!lc || !chart) return;

        if (candleSeriesRef.current) {
            chart.removeSeries(candleSeriesRef.current);
            candleSeriesRef.current = null;
        }
        if (areaSeriesRef.current) {
            chart.removeSeries(areaSeriesRef.current);
            areaSeriesRef.current = null;
        }
        if (volumeSeriesRef.current) {
            chart.removeSeries(volumeSeriesRef.current);
            volumeSeriesRef.current = null;
        }

        if (chartType === "candlestick") {
            candleSeriesRef.current = chart.addSeries(lc.CandlestickSeries, {
                upColor: "#10b981",
                downColor: "#f43f5e",
                borderUpColor: "#10b981",
                borderDownColor: "#f43f5e",
                wickUpColor: "#10b981aa",
                wickDownColor: "#f43f5eaa",
            });
        } else {
            areaSeriesRef.current = chart.addSeries(lc.AreaSeries, {
                lineColor: "#007AFF",
                topColor: "rgba(0, 122, 255, 0.18)",
                bottomColor: "rgba(0, 122, 255, 0.0)",
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 4,
                crosshairMarkerBorderColor: "#007AFF",
                crosshairMarkerBackgroundColor: "rgba(0, 122, 255, 0.3)",
            });
        }

        volumeSeriesRef.current = chart.addSeries(lc.HistogramSeries, {
            priceFormat: { type: "volume" },
            priceScaleId: "volume",
        });
        chart.priceScale("volume").applyOptions({
            scaleMargins: { top: 0.82, bottom: 0 },
        });
    }, [chartReady, chartType]);

    // ── Effect 3: Indicator line series ──
    useEffect(() => {
        const lc = lcRef.current;
        const chart = chartRef.current;
        if (!lc || !chart) return;

        const lineOpts = (color: string) => ({
            color,
            lineWidth: 1,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        if (activeIndicators.has("MA7") && !ma7SeriesRef.current) {
            ma7SeriesRef.current = chart.addSeries(
                lc.LineSeries,
                lineOpts("#f59e0b"),
            );
        } else if (!activeIndicators.has("MA7") && ma7SeriesRef.current) {
            chart.removeSeries(ma7SeriesRef.current);
            ma7SeriesRef.current = null;
        }

        if (activeIndicators.has("MA25") && !ma25SeriesRef.current) {
            ma25SeriesRef.current = chart.addSeries(
                lc.LineSeries,
                lineOpts("#a78bfa"),
            );
        } else if (!activeIndicators.has("MA25") && ma25SeriesRef.current) {
            chart.removeSeries(ma25SeriesRef.current);
            ma25SeriesRef.current = null;
        }

        if (activeIndicators.has("EMA99") && !ema99SeriesRef.current) {
            ema99SeriesRef.current = chart.addSeries(
                lc.LineSeries,
                lineOpts("#38bdf8"),
            );
        } else if (!activeIndicators.has("EMA99") && ema99SeriesRef.current) {
            chart.removeSeries(ema99SeriesRef.current);
            ema99SeriesRef.current = null;
        }
    }, [chartReady, activeIndicators]);

    // ── Effect 4: Data synchronization ──
    useEffect(() => {
        if (!data.length || !chartRef.current) return;

        const ts = chartRef.current.timeScale();
        const visibleRange = ts.getVisibleLogicalRange();

        const toTime = (t: number) => (t / 1000) as UTCTimestamp;
        const normalizedData = Array.from(
            new Map(
                data
                    .slice()
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((d) => [d.timestamp, d] as const),
            ).values(),
        );

        if (candleSeriesRef.current) {
            candleSeriesRef.current.setData(
                normalizedData.map((d) => ({
                    time: toTime(d.timestamp),
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                })),
            );
        }

        if (areaSeriesRef.current) {
            areaSeriesRef.current.setData(
                normalizedData.map((d) => ({
                    time: toTime(d.timestamp),
                    value: d.close,
                })),
            );
        }

        if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(
                normalizedData.map((d) => ({
                    time: toTime(d.timestamp),
                    value: d.volume,
                    color:
                        d.close >= d.open
                            ? "rgba(16, 185, 129, 0.25)"
                            : "rgba(244, 63, 94, 0.25)",
                })),
            );
        }

        if (ma7SeriesRef.current) {
            ma7SeriesRef.current.setData(
                normalizedData
                    .filter((d) => d.MA7 != null)
                    .map((d) => ({
                        time: toTime(d.timestamp),
                        value: d.MA7!,
                    })),
            );
        }
        if (ma25SeriesRef.current) {
            ma25SeriesRef.current.setData(
                normalizedData
                    .filter((d) => d.MA25 != null)
                    .map((d) => ({
                        time: toTime(d.timestamp),
                        value: d.MA25!,
                    })),
            );
        }
        if (ema99SeriesRef.current) {
            ema99SeriesRef.current.setData(
                normalizedData
                    .filter((d) => d.EMA99 != null)
                    .map((d) => ({
                        time: toTime(d.timestamp),
                        value: d.EMA99!,
                    })),
            );
        }

        if (isInitialFit.current) {
            ts.fitContent();
            isInitialFit.current = false;
        } else if (visibleRange) {
            ts.setVisibleLogicalRange(visibleRange);
        }
    }, [data, chartReady, chartType, activeIndicators]);

    // ── Go to latest ──
    const goToLatest = useCallback(() => {
        chartRef.current?.timeScale().scrollToRealTime();
        setIsPanned(false);
    }, []);

    const indicators: { key: Indicator; label: string; color: string }[] = [
        { key: "MA7", label: "MA(7)", color: "#f59e0b" },
        { key: "MA25", label: "MA(25)", color: "#a78bfa" },
        { key: "EMA99", label: "EMA(99)", color: "#38bdf8" },
    ];
    const priceLabel = currentAsset
        ? universe === "stock"
            ? priceFmt(currentAsset.price)
            : `$${priceFmt(currentAsset.price)}`
        : "—";
    const changeLabel = currentAsset
        ? `${isPositive ? "+" : ""}${currentAsset.changePercent.toFixed(2)}%`
        : "—";
    const changeValueLabel = currentAsset
        ? `${isPositive ? "+" : ""}${Math.abs(
              currentAsset.change ?? 0,
          ).toLocaleString("en-US", {
              minimumFractionDigits: 2,
          })}`
        : "—";
    const sessionStats = [
        {
            key: "O",
            label: "Open",
            value: displayedLastPoint ? priceFmt(displayedLastPoint.open) : "—",
            valueClass: "text-main",
        },
        {
            key: "H",
            label: "High",
            value: displayedLastPoint ? priceFmt(displayedLastPoint.high) : "—",
            valueClass: "text-emerald-500",
        },
        {
            key: "L",
            label: "Low",
            value: displayedLastPoint ? priceFmt(displayedLastPoint.low) : "—",
            valueClass: "text-rose-500",
        },
        {
            key: "C",
            label: "Close",
            value: displayedLastPoint
                ? priceFmt(displayedLastPoint.close)
                : "—",
            valueClass:
                displayedLastPoint &&
                displayedLastPoint.close < displayedLastPoint.open
                    ? "text-rose-500"
                    : "text-emerald-500",
        },
        {
            key: "V",
            label: "Vol",
            value: displayedLastPoint ? volFmt(displayedLastPoint.volume) : "—",
            valueClass: "text-accent",
        },
    ];
    const marketStats = currentAsset
        ? [
              {
                  key: "chg",
                  label: "24h Chg",
                  value: `${isPositive ? "+" : ""}${priceFmt(currentAsset.change)}`,
                  sub: `(${isPositive ? "+" : ""}${currentAsset.changePercent.toFixed(2)}%)`,
                  valueClass: isPositive ? "text-emerald-500" : "text-rose-500",
              },
              {
                  key: "h",
                  label: "24h High",
                  value: priceFmt(currentAsset.high24h ?? 0),
                  sub: "",
                  valueClass: "text-emerald-500",
              },
              {
                  key: "l",
                  label: "24h Low",
                  value: priceFmt(currentAsset.low24h ?? 0),
                  sub: "",
                  valueClass: "text-rose-500",
              },
              {
                  key: "baseVol",
                  label: `Vol(${currentAsset.symbol})`,
                  value: compactNumberFmt(currentAsset.baseVolume ?? 0),
                  sub: "",
                  valueClass: "text-main",
              },
              {
                  key: "quoteVol",
                  label: `Vol(${universe === "stock" ? "VND" : "USDT"})`,
                  value: compactNumberFmt(currentAsset.quoteVolumeRaw ?? 0),
                  sub: "",
                  valueClass: "text-accent",
              },
          ]
        : [];

    return (
        <div className="h-full flex flex-col">
            {/* ── Header ── */}
            <div className="px-5 pt-3 pb-2 border-b border-main shrink-0">
                {/* Price row */}
                <div className="flex items-start justify-between gap-4 pb-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <h2 className="truncate text-[16px] font-bold tracking-tight">
                                {currentAsset?.name ??
                                    selectedSymbol.replace(/USDT|-C|-F/gi, "")}
                                <span className="text-muted font-normal text-[12px] ml-1">
                                    / {universe === "stock" ? "VND" : "USDT"}
                                </span>
                            </h2>
                            <span className="px-1 py-0.5 bg-secondary text-muted text-[9px] font-semibold rounded uppercase">
                                {selectedSymbol}
                            </span>
                        </div>
                        <div className="mt-1 flex items-end gap-2">
                            <span className="text-[24px] font-mono font-semibold tracking-tighter leading-none">
                                {priceLabel}
                            </span>
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1   px-1.5 py-0.5 text-[11px] font-semibold",
                                    isPositive
                                        ? "border-emerald-500/35 text-emerald-500"
                                        : "border-rose-500/35 text-rose-500",
                                )}
                            >
                                {isPositive ? (
                                    <TrendingUp size={11} />
                                ) : (
                                    <TrendingDown size={11} />
                                )}
                                <span>{changeLabel}</span>
                                <span className="opacity-80">
                                    ({changeValueLabel})
                                </span>
                            </span>
                        </div>
                    </div>

                    <div className="shrink-0" />
                </div>

                {/* ── Stats Section ── */}
                <div className="space-y-1.5 pt-1.5">
                    <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap thin-scrollbar text-[10px]">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                            {interval}
                        </span>
                        {sessionStats.map((item) => (
                            <span
                                key={item.key}
                                className="inline-flex items-center gap-1"
                            >
                                <span className="text-muted">
                                    {item.label}:
                                </span>
                                <span
                                    className={cn(
                                        "font-mono font-semibold",
                                        item.valueClass,
                                    )}
                                >
                                    {item.value}
                                </span>
                            </span>
                        ))}
                    </div>

                    {marketStats.length > 0 && (
                        <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap thin-scrollbar text-[10px] pb-0.5">
                            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                                24h
                            </span>
                            {marketStats.map((item) => (
                                <span
                                    key={item.key}
                                    className="inline-flex items-center gap-1"
                                >
                                    <span className="text-muted">
                                        {item.label}:
                                    </span>
                                    <span
                                        className={cn(
                                            "font-mono font-semibold",
                                            item.valueClass,
                                        )}
                                    >
                                        {item.value}
                                    </span>
                                    {item.sub ? (
                                        <span className="font-mono text-muted">
                                            {item.sub}
                                        </span>
                                    ) : null}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Controls row */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-2">
                    {/* Interval pills */}
                    <div className="flex items-center space-x-0.5">
                        {activeTab === "chart" &&
                            CHART_INTERVALS.map((iv) => (
                                <button
                                    key={iv}
                                    onClick={() => setInterval(iv)}
                                    className={cn(
                                        "h-5 rounded px-2 text-[10px] font-semibold tracking-wide transition-colors",
                                        interval === iv
                                            ? "border-blue-500/40 bg-blue-500/15 text-blue-400 border"
                                            : "text-muted hover:text-main hover:bg-secondary",
                                    )}
                                >
                                    {iv}
                                </button>
                            ))}
                    </div>

                    {/* Chart type + Indicator toggles (center) */}
                    <div className="flex items-center justify-center">
                        {activeTab === "chart" && (
                            <div className="flex items-center space-x-2">
                                {isPanned && (
                                    <button
                                        onClick={goToLatest}
                                        className="flex items-center space-x-1 px-2 py-0.5 rounded border border-accent/40 text-accent text-[10px] font-medium hover:bg-accent/10 transition-colors"
                                    >
                                        <ChevronsRight size={11} />
                                        <span>Latest</span>
                                    </button>
                                )}

                                {isFetchingHistory && (
                                    <Loader2
                                        size={11}
                                        className="text-muted animate-spin"
                                    />
                                )}

                                <div className="flex items-center bg-secondary border border-main rounded">
                                    <button
                                        onClick={() => setChartType("candlestick")}
                                        title="Candlestick"
                                        className={cn(
                                            "p-1 rounded transition-all",
                                            chartType === "candlestick"
                                                ? "bg-main text-accent shadow-sm"
                                                : "text-muted hover:text-main",
                                        )}
                                    >
                                        <BarChart2 size={12} />
                                    </button>
                                    <button
                                        onClick={() => setChartType("area")}
                                        title="Area"
                                        className={cn(
                                            "p-1 rounded transition-all",
                                            chartType === "area"
                                                ? "bg-main text-accent shadow-sm"
                                                : "text-muted hover:text-main",
                                        )}
                                    >
                                        <LineChart size={12} />
                                    </button>
                                </div>

                                <div className="flex items-center space-x-1">
                                    {indicators.map(({ key, label, color }) => (
                                        <button
                                            key={key}
                                            onClick={() => toggleIndicator(key)}
                                            style={
                                                activeIndicators.has(key)
                                                    ? { borderColor: color, color }
                                                    : {}
                                            }
                                            className={cn(
                                                "px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border transition-all",
                                                activeIndicators.has(key)
                                                    ? "bg-transparent"
                                                    : "border-main text-muted hover:border-main",
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* View switcher (right) */}
                    <div className="flex items-center justify-end gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "inline-flex h-6 items-center gap-1 rounded border px-3 text-[9px] font-semibold tracking-wide transition-colors",
                                    activeTab === tab
                                        ? tabMeta[tab].activeClass
                                        : "border-main text-muted hover:text-main hover:bg-secondary",
                                )}
                            >
                                <span>{tabMeta[tab].label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Chart / Info / Flow ── */}
            {activeTab === "info" ? (
                <CoinInfoPanel />
            ) : activeTab === "flow" ? (
                <FlowPanel />
            ) : activeTab === "liquidation" ? (
                <FuturesLiquidationPanel />
            ) : (
                <div className="flex-1 min-h-[260px] relative">
                    {isLoading && data.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-main/60 z-10"></div>
                    )}

                    {/* Floating OHLCV legend — updated by crosshair via DOM */}
                    <div
                        ref={legendRef}
                        className="absolute top-2 left-3 z-10 pointer-events-none text-[10px] flex items-center gap-2 transition-opacity duration-100"
                        style={{ opacity: 0 }}
                    />

                    {/* History loading spinner */}
                    {isFetchingHistory && (
                        <div className="absolute top-2 right-3 z-10">
                            <Loader2
                                size={12}
                                className="text-muted animate-spin"
                            />
                        </div>
                    )}

                    {/* Canvas chart container */}
                    <div
                        ref={chartContainerRef}
                        className="absolute inset-0 min-w-[320px] min-h-[260px]"
                    />
                </div>
            )}
        </div>
    );
};
