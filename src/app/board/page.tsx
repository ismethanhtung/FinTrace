"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
    useMemo,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import {
    Search,
    Settings,
    LayoutGrid,
    ChevronDown,
    ArrowUp,
    ArrowDown,
    Sun,
    Moon,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { AppTopBar } from "../../components/shell/AppTopBar";
import { TickerBar } from "../../components/TickerBar";
import { TokenAvatar } from "../../components/TokenAvatar";
import { cn } from "../../lib/utils";
import { useUniverse } from "../../context/UniverseContext";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useMarket } from "../../context/MarketContext";
import { useDnseBoardStream } from "../../hooks/useDnseBoardStream";
import { useVietcapBoardSnapshot } from "../../hooks/useVietcapBoardSnapshot";

type BoardStockRow = {
    id: string;
    ticker: string;
    name: string;
    logoUrl?: string;
    exchange?: string;
    indexMembership: string[];
    ceiling: number;
    floor: number;
    tc: number;
    ref: number;
    buy: { price: number; vol: string }[];
    match: { price: number; vol: string; change: number; percent: number };
    sell: { price: number; vol: string }[];
    totalVol: string;
    high: number;
    low: number;
    foreign: { buy: string; sell: string; room: string };
};

type BoardSortKey =
    | "ticker"
    | "ceiling"
    | "floor"
    | "ref"
    | "buy0Price"
    | "buy0Vol"
    | "buy1Price"
    | "buy1Vol"
    | "buy2Price"
    | "buy2Vol"
    | "matchPrice"
    | "matchVol"
    | "matchChange"
    | "matchPercent"
    | "sell0Price"
    | "sell0Vol"
    | "sell1Price"
    | "sell1Vol"
    | "sell2Price"
    | "sell2Vol"
    | "totalVol"
    | "high"
    | "low"
    | "foreignBuy"
    | "foreignSell"
    | "foreignRoom";

function parseBoardVolString(s: string): number {
    const n = Number(String(s).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function getBoardSortValue(
    row: BoardStockRow,
    key: BoardSortKey,
): number | string {
    switch (key) {
        case "ticker":
            return row.ticker;
        case "ceiling":
            return row.ceiling;
        case "floor":
            return row.floor;
        case "ref":
            return row.ref;
        case "buy0Price":
            return row.buy[0]?.price ?? 0;
        case "buy0Vol":
            return parseBoardVolString(row.buy[0]?.vol ?? "0");
        case "buy1Price":
            return row.buy[1]?.price ?? 0;
        case "buy1Vol":
            return parseBoardVolString(row.buy[1]?.vol ?? "0");
        case "buy2Price":
            return row.buy[2]?.price ?? 0;
        case "buy2Vol":
            return parseBoardVolString(row.buy[2]?.vol ?? "0");
        case "matchPrice":
            return row.match.price;
        case "matchVol":
            return parseBoardVolString(row.match.vol);
        case "matchChange":
            return row.match.change;
        case "matchPercent":
            return row.match.percent;
        case "sell0Price":
            return row.sell[0]?.price ?? 0;
        case "sell0Vol":
            return parseBoardVolString(row.sell[0]?.vol ?? "0");
        case "sell1Price":
            return row.sell[1]?.price ?? 0;
        case "sell1Vol":
            return parseBoardVolString(row.sell[1]?.vol ?? "0");
        case "sell2Price":
            return row.sell[2]?.price ?? 0;
        case "sell2Vol":
            return parseBoardVolString(row.sell[2]?.vol ?? "0");
        case "totalVol":
            return parseBoardVolString(row.totalVol);
        case "high":
            return row.high;
        case "low":
            return row.low;
        case "foreignBuy":
            return parseBoardVolString(row.foreign.buy);
        case "foreignSell":
            return parseBoardVolString(row.foreign.sell);
        case "foreignRoom":
            return parseBoardVolString(row.foreign.room || "0");
        default:
            return 0;
    }
}

function compareBoardSortValues(
    a: number | string,
    b: number | string,
): number {
    if (typeof a === "string" && typeof b === "string") {
        return a.localeCompare(b, "vi", {
            sensitivity: "base",
            numeric: true,
        });
    }
    const na = typeof a === "number" ? a : Number(a);
    const nb = typeof b === "number" ? b : Number(b);
    const aBad = !Number.isFinite(na);
    const bBad = !Number.isFinite(nb);
    if (aBad && bBad) return 0;
    if (aBad) return 1;
    if (bBad) return -1;
    return na - nb;
}

type IndexData = {
    name: string;
    value: number;
    change: number;
    vol: string;
    valueT: string;
    up: number;
    ref: number;
    down: number;
};

type CellFlashTone =
    | "emerald"
    | "rose"
    | "amber"
    | "cyan"
    | "fuchsia"
    | "slate";

type CellFlashState = {
    until: number;
    tone: CellFlashTone;
};

const INDEX_NAMES = ["VNINDEX", "VN30", "HNX30", "VNXALL", "HNXINDEX", "UPCOM"];
const INITIAL_COL_WIDTHS = [
    70, 50, 50, 50, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 64, 60, 60, 60, 60,
    70, 90, 64, 64, 86, 86, 100,
];

const EMPTY_BOARD_PLACEHOLDER: BoardStockRow = {
    id: "EMPTY",
    ticker: "0",
    name: "0",
    logoUrl: undefined,
    exchange: undefined,
    indexMembership: [],
    ceiling: Number.NaN,
    floor: Number.NaN,
    tc: Number.NaN,
    ref: Number.NaN,
    buy: [
        { price: Number.NaN, vol: "" },
        { price: Number.NaN, vol: "" },
        { price: Number.NaN, vol: "" },
    ],
    match: {
        price: Number.NaN,
        vol: "",
        change: Number.NaN,
        percent: Number.NaN,
    },
    sell: [
        { price: Number.NaN, vol: "" },
        { price: Number.NaN, vol: "" },
        { price: Number.NaN, vol: "" },
    ],
    totalVol: "",
    high: Number.NaN,
    low: Number.NaN,
    foreign: { buy: "", sell: "", room: "" },
};

const EMPTY_INDEX_STATS: IndexData = {
    name: "",
    value: 0,
    change: 0,
    vol: "0",
    valueT: "0",
    up: 0,
    ref: 0,
    down: 0,
};

const BOARD_CELL_FLASH_MS = 900;

const FLASH_BG_CLASS_BY_TONE: Record<CellFlashTone, string> = {
    emerald: "bg-emerald-500 !text-white",
    rose: "bg-rose-500 !text-white",
    amber: "bg-amber-500 !text-white",
    cyan: "bg-cyan-500 !text-white",
    fuchsia: "bg-fuchsia-500 !text-white",
    slate: "bg-slate-500 !text-white",
};

function formatBoardVolume(value: number | undefined): string {
    if (!Number.isFinite(value)) return "";
    const safe = Math.max(0, value ?? 0);
    return Math.round(safe).toLocaleString("en-US");
}

function formatBoardPriceDisplay(value: number): string {
    return Number.isFinite(value) ? (value / 1000).toFixed(2) : "";
}

function formatBoardSignedPriceDisplay(value: number): string {
    if (!Number.isFinite(value)) return "";
    const scaled = value / 1000;
    return `${scaled >= 0 ? "+" : ""}${scaled.toFixed(2)}`;
}

function formatBoardPercentDisplay(value: number): string {
    return Number.isFinite(value) ? `${value.toFixed(2)}%` : "";
}

function formatBoardStringDisplay(value: string): string {
    return value;
}

function getPriceTone(
    value: number,
    refVal: number,
    ceiling: number,
    floor: number,
): CellFlashTone {
    if (value === ceiling) return "fuchsia";
    if (value === floor) return "cyan";
    if (value > refVal) return "emerald";
    if (value < refVal) return "rose";
    return "amber";
}

function generateChartData(points: number, base: number) {
    return Array.from({ length: points }, (_, i) => ({
        time: `${9 + Math.floor(i / 12)}h${String((i % 12) * 5).padStart(2, "0")}`,
        value: base,
    }));
}

function ColorText({
    value,
    refVal,
    ceiling,
    floor,
    children,
    className,
}: {
    value: number;
    refVal: number;
    ceiling: number;
    floor: number;
    children: React.ReactNode;
    className?: string;
}) {
    const tone = getPriceTone(value, refVal, ceiling, floor);
    const color =
        tone === "fuchsia"
            ? "text-[#c05af2]"
            : tone === "cyan"
              ? "text-cyan-500"
              : tone === "emerald"
                ? "text-[#32d74b]"
                : tone === "rose"
                  ? "text-[#ff2727]"
                  : "text-[#ffbe0c]";

    return <span className={cn(color, className)}>{children}</span>;
}

function MiniChart({
    data,
    color,
    title,
    stats,
}: {
    data: { time: string; value: number }[];
    color: string;
    title: string;
    stats: IndexData;
}) {
    const chartHostRef = useRef<HTMLDivElement | null>(null);
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const host = chartHostRef.current;
        if (!host) return;

        const updateSize = () => {
            const rect = host.getBoundingClientRect();
            setChartSize({
                width: Math.max(0, Math.floor(rect.width)),
                height: Math.max(0, Math.floor(rect.height)),
            });
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(host);
        return () => observer.disconnect();
    }, []);

    const isPositive = stats.change >= 0;
    const changeText = `${isPositive ? "+" : ""}${stats.change.toFixed(2)}`;
    const rawPercent =
        stats.value - stats.change !== 0
            ? (stats.change / (stats.value - stats.change)) * 100
            : 0;
    const percentText = `${rawPercent >= 0 ? "+" : ""}${rawPercent.toFixed(2)}%`;

    return (
        <div className="flex-1 min-w-[240px] min-h-[160px] min-w-0 border border-main bg-secondary rounded-sm p-2">
            <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-main">
                        {title}
                        <ChevronDown size={12} className="text-muted" />
                    </div>
                    <div
                        className={cn(
                            "text-[18px] font-bold leading-tight",
                            isPositive ? "text-emerald-500" : "text-rose-500",
                        )}
                    >
                        {stats.value.toLocaleString()}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold">
                        <span
                            className={cn(
                                isPositive
                                    ? "text-emerald-500"
                                    : "text-rose-500",
                            )}
                        >
                            {changeText}
                        </span>
                        <span
                            className={cn(
                                rawPercent >= 0
                                    ? "text-emerald-500"
                                    : "text-rose-500",
                            )}
                        >
                            {percentText}
                        </span>
                    </div>
                    <div className="text-[10px] text-muted">
                        {stats.vol} CP <span className="mx-1">|</span>{" "}
                        {stats.valueT} Tỷ
                    </div>
                </div>
                <div className="text-[10px]">
                    <div className="flex gap-2">
                        <span className="text-emerald-500">▲ {stats.up}</span>
                        <span className="text-amber-500">■ {stats.ref}</span>
                        <span className="text-rose-500">▼ {stats.down}</span>
                    </div>
                    <div className="mt-1 text-right text-muted">Liên tục</div>
                </div>
            </div>
            <div ref={chartHostRef} className="h-24 w-full min-w-0">
                {chartSize.width > 0 && chartSize.height > 0 ? (
                    <AreaChart
                        width={chartSize.width}
                        height={chartSize.height}
                        data={data}
                    >
                        <defs>
                            <linearGradient
                                id={`grad-${title}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor={color}
                                    stopOpacity={0.3}
                                />
                                <stop
                                    offset="95%"
                                    stopColor={color}
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="var(--border-color)"
                        />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "var(--bg-secondary)",
                                border: "1px solid var(--border-color)",
                                fontSize: "10px",
                                color: "var(--text-main)",
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            fillOpacity={1}
                            fill={`url(#grad-${title})`}
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                ) : null}
            </div>
        </div>
    );
}

function BoardRowSkeleton({
    index,
    isLight,
}: {
    index: number;
    isLight: boolean;
}) {
    const rowClass = cn(
        "border-b border-main transition-colors",
        index % 2 === 0
            ? "bg-main"
            : isLight
              ? "bg-black/[0.04]"
              : "bg-white/[0.035]",
    );
    return (
        <tr className={rowClass}>
            <td className="border-r border-main p-2">
                <div className="flex items-center gap-1.5">
                    <div className="h-[18px] w-[18px] shrink-0 rounded-full bg-muted/20 animate-pulse" />
                    <div className="h-3 w-10 rounded bg-muted/20 animate-pulse" />
                </div>
            </td>
            {Array.from({ length: 25 }).map((_, i) => (
                <td key={i} className="border-r border-main p-1 text-right">
                    <div className="ml-auto h-3 w-10 rounded bg-muted/20 animate-pulse" />
                </td>
            ))}
        </tr>
    );
}

export default function BoardPage() {
    const { universe } = useUniverse();
    const { toggleTheme, theme } = useAppSettings();
    const router = useRouter();
    const { assets, setSelectedSymbol } = useMarket();
    const [activeTab, setActiveTab] = useState("VN30");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [colWidths, setColWidths] = useState<number[]>(INITIAL_COL_WIDTHS);
    const [boardSort, setBoardSort] = useState<{
        key: BoardSortKey;
        dir: "asc" | "desc";
    } | null>(null);
    const resizeStateRef = useRef<{
        index: number;
        startX: number;
        startWidth: number;
    } | null>(null);
    const prevCellValuesRef = useRef<Record<string, number | string>>({});
    const [cellFlashes, setCellFlashes] = useState<
        Record<string, CellFlashState>
    >({});

    useEffect(() => {
        if (assets.length > 0) {
            setIsLoading(false);
        }
        const timer = setTimeout(() => setIsLoading(false), 3000);
        return () => clearTimeout(timer);
    }, [assets.length]);

    const chartData = useMemo(
        () => ({
            VNINDEX: generateChartData(50, 0),
            VN30: generateChartData(50, 0),
            HNX30: generateChartData(50, 0),
            VNXALL: generateChartData(50, 0),
            HNXINDEX: generateChartData(50, 0),
        }),
        [],
    );

    const isLight = theme === "light";
    const getRowClassName = useCallback(
        (index: number) =>
            cn(
                "border-b border-main transition-colors hover:!bg-accent/15",
                index % 2 === 0
                    ? "bg-main"
                    : isLight
                      ? "bg-black/[0.04]"
                      : "bg-white/[0.035]",
            ),
        [isLight],
    );
    const handleResizeStart = useCallback(
        (columnIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();

            resizeStateRef.current = {
                index: columnIndex,
                startX: e.clientX,
                startWidth:
                    colWidths[columnIndex] ?? INITIAL_COL_WIDTHS[columnIndex],
            };

            const onMouseMove = (event: MouseEvent) => {
                const state = resizeStateRef.current;
                if (!state) return;
                const deltaX = event.clientX - state.startX;
                const minWidth = state.index === 0 ? 80 : 56;
                const nextWidth = Math.max(minWidth, state.startWidth + deltaX);
                setColWidths((prev) => {
                    const next = [...prev];
                    next[state.index] = nextWidth;
                    return next;
                });
            };

            const onMouseUp = () => {
                resizeStateRef.current = null;
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            };

            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        },
        [colWidths],
    );
    const resizeHandleClass =
        "absolute right-0 top-0 z-20 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-accent/50";
    const q = search.trim().toLowerCase();
    const normalizedTab = activeTab.trim().toUpperCase();

    const streamBoards = useMemo(() => {
        if (normalizedTab === "HNX" || normalizedTab === "HNX30") {
            return ["G2"];
        }
        if (normalizedTab === "UPCOM") {
            return ["G3"];
        }
        if (normalizedTab === "HOSE" || normalizedTab === "VN30") {
            return ["G1"];
        }
        return ["G1", "G2", "G3"];
    }, [normalizedTab]);
    const vietcapSnapshotGroups = useMemo(
        () => ["VN30", "HNX30", "HOSE", "HNX", "UPCOM"],
        [],
    );

    const {
        snapshotBySymbol: vietcapSnapshotBySymbol,
        groupsBySymbol: vietcapGroupsBySymbol,
        count: vietcapSnapshotCount,
        isLoading: isVietcapSnapshotLoading,
        error: vietcapSnapshotError,
    } = useVietcapBoardSnapshot({
        enabled: universe === "stock",
        groups: vietcapSnapshotGroups,
        refreshIntervalMs: 45_000,
    });

    const assetBySymbol = useMemo(() => {
        const out = new Map<string, (typeof assets)[number]>();
        assets.forEach((asset) => {
            const symbol = asset.symbol.trim().toUpperCase();
            if (symbol) out.set(symbol, asset);
        });
        return out;
    }, [assets]);

    const filteredSymbols = useMemo(() => {
        const symbols = Object.keys(vietcapSnapshotBySymbol).map((s) =>
            s.trim().toUpperCase(),
        );
        const tabGroups = new Set(["VN30", "HNX30", "HOSE", "HNX", "UPCOM"]);

        return symbols.filter((symbol) => {
            const snapshot = vietcapSnapshotBySymbol[symbol];
            const asset = assetBySymbol.get(symbol);
            const name = (
                snapshot?.companyName ||
                asset?.name ||
                symbol
            ).toLowerCase();
            const id = (asset?.id || symbol).toLowerCase();
            const searchMatched = q
                ? symbol.toLowerCase().includes(q) ||
                  name.includes(q) ||
                  id.includes(q)
                : true;
            if (!searchMatched) return false;

            if (!tabGroups.has(normalizedTab)) return true;
            const groups = (vietcapGroupsBySymbol[symbol] || []).map((g) =>
                g.trim().toUpperCase(),
            );
            return groups.includes(normalizedTab);
        });
    }, [
        assetBySymbol,
        normalizedTab,
        q,
        vietcapGroupsBySymbol,
        vietcapSnapshotBySymbol,
    ]);

    const streamSymbols = useMemo(
        () => filteredSymbols.filter(Boolean),
        [filteredSymbols],
    );

    const {
        status: streamStatus,
        error: streamError,
        dataBySymbol,
        dataByMarketIndex,
        isTruncated,
    } = useDnseBoardStream(streamSymbols, {
        board: streamBoards[0] ?? "G1",
        boards: streamBoards,
        marketIndex: "VNINDEX",
        marketIndexes: INDEX_NAMES,
        resolution: "1",
    });

    const indexRows = useMemo<IndexData[]>(
        () =>
            INDEX_NAMES.map((name) => {
                const stream = dataByMarketIndex[name];
                const value = Number.isFinite(stream?.value)
                    ? stream!.value!
                    : 0;
                const change = Number.isFinite(stream?.changedValue)
                    ? stream!.changedValue!
                    : 0;
                const volRaw = Number.isFinite(stream?.totalVolumeTraded)
                    ? stream!.totalVolumeTraded!
                    : 0;
                const valueTRaw = Number.isFinite(stream?.grossTradeAmount)
                    ? stream!.grossTradeAmount!
                    : 0;
                return {
                    name,
                    value,
                    change,
                    vol: Math.round(volRaw).toLocaleString("en-US"),
                    valueT: valueTRaw.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                    }),
                    up: Number.isFinite(stream?.upCount)
                        ? Math.round(stream!.upCount!)
                        : 0,
                    ref: Number.isFinite(stream?.refCount)
                        ? Math.round(stream!.refCount!)
                        : 0,
                    down: Number.isFinite(stream?.downCount)
                        ? Math.round(stream!.downCount!)
                        : 0,
                };
            }),
        [dataByMarketIndex],
    );
    const indexByName = useMemo(
        () => Object.fromEntries(indexRows.map((row) => [row.name, row])),
        [indexRows],
    );

    const boardRows = useMemo<BoardStockRow[]>(
        () =>
            filteredSymbols.map((symbol) => {
                const asset = assetBySymbol.get(symbol);
                const stream = dataBySymbol[symbol];
                const snapshot = vietcapSnapshotBySymbol[symbol];
                const price = Number.isFinite(asset?.price)
                    ? asset!.price
                    : Number.NaN;
                const change = Number.isFinite(asset?.change)
                    ? asset!.change
                    : Number.NaN;
                const ref =
                    stream?.ref ??
                    snapshot?.ref ??
                    (Number.isFinite(price) && Number.isFinite(change)
                        ? Math.max(0, price - change)
                        : Number.NaN);
                const tc = ref;
                const mkQty = Number.isFinite(asset?.baseVolume)
                    ? asset!.baseVolume
                    : undefined;
                const matchPrice = stream?.price ?? snapshot?.price ?? price;
                const matchChange =
                    Number.isFinite(ref) && Number.isFinite(matchPrice)
                        ? matchPrice - ref
                        : Number.NaN;
                const matchPercent =
                    Number.isFinite(ref) &&
                    ref > 0 &&
                    Number.isFinite(matchChange)
                        ? (matchChange / ref) * 100
                        : Number.NaN;

                const buy = Array.from({ length: 3 }, (_, idx) => {
                    const level =
                        stream?.bid?.[2 - idx] ?? snapshot?.bid?.[2 - idx];
                    return {
                        price: level?.price ?? Number.NaN,
                        vol: formatBoardVolume(level?.quantity),
                    };
                });
                const sell = Array.from({ length: 3 }, (_, idx) => {
                    const level =
                        stream?.offer?.[idx] ?? snapshot?.offer?.[idx];
                    return {
                        price: level?.price ?? Number.NaN,
                        vol: formatBoardVolume(level?.quantity),
                    };
                });
                return {
                    id: asset?.id || symbol,
                    ticker: symbol,
                    name: snapshot?.companyName || asset?.name || symbol,
                    logoUrl:
                        asset?.logoUrl ||
                        `/stock/image/${encodeURIComponent(symbol)}`,
                    exchange:
                        snapshot?.exchange ?? asset?.stockProfile?.exchange,
                    indexMembership:
                        vietcapGroupsBySymbol[symbol] ||
                        asset?.stockProfile?.indexMembership ||
                        [],
                    ceiling: stream?.ceiling ?? snapshot?.ceiling ?? Number.NaN,
                    floor: stream?.floor ?? snapshot?.floor ?? Number.NaN,
                    tc,
                    ref,
                    buy,
                    match: {
                        price: matchPrice,
                        vol: formatBoardVolume(
                            stream?.quantity ?? snapshot?.quantity ?? mkQty,
                        ),
                        change: Number.isFinite(matchChange)
                            ? matchChange
                            : Number.NaN,
                        percent: Number.isFinite(matchPercent)
                            ? matchPercent
                            : Number.NaN,
                    },
                    sell,
                    totalVol: formatBoardVolume(
                        stream?.totalVolumeTraded ??
                            snapshot?.totalVolumeTraded ??
                            mkQty,
                    ),
                    high:
                        stream?.highestPrice ??
                        snapshot?.highestPrice ??
                        (Number.isFinite(asset?.high24h)
                            ? asset!.high24h
                            : Number.NaN),
                    low:
                        stream?.lowestPrice ??
                        snapshot?.lowestPrice ??
                        (Number.isFinite(asset?.low24h)
                            ? asset!.low24h
                            : Number.NaN),
                    foreign: {
                        buy: formatBoardVolume(snapshot?.foreignBuy),
                        sell: formatBoardVolume(snapshot?.foreignSell),
                        room: formatBoardVolume(snapshot?.foreignRoom),
                    },
                };
            }),
        [
            assetBySymbol,
            dataBySymbol,
            filteredSymbols,
            vietcapGroupsBySymbol,
            vietcapSnapshotBySymbol,
        ],
    );

    const rowsForTable = useMemo(() => {
        const base = boardRows.length ? boardRows : [EMPTY_BOARD_PLACEHOLDER];
        if (!boardRows.length || !boardSort) return base;
        const order = new Map(base.map((r, i) => [r.id, i]));
        return [...base].sort((a, b) => {
            const va = getBoardSortValue(a, boardSort.key);
            const vb = getBoardSortValue(b, boardSort.key);
            let c = compareBoardSortValues(va, vb);
            if (c === 0) c = (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
            return boardSort.dir === "asc" ? c : -c;
        });
    }, [boardRows, boardSort]);

    const rowCellSnapshots = useMemo(() => {
        const snapshots: Array<{
            key: string;
            value: number | string;
            tone: CellFlashTone;
        }> = [];
        for (const row of rowsForTable) {
            if (row.id === "EMPTY") continue;
            snapshots.push(
                {
                    key: `${row.id}:ceiling`,
                    value: row.ceiling,
                    tone: "fuchsia",
                },
                {
                    key: `${row.id}:floor`,
                    value: row.floor,
                    tone: "cyan",
                },
                { key: `${row.id}:ref`, value: row.tc, tone: "amber" },
                {
                    key: `${row.id}:matchPrice`,
                    value: row.match.price,
                    tone: getPriceTone(
                        row.match.price,
                        row.ref,
                        row.ceiling,
                        row.floor,
                    ),
                },
                {
                    key: `${row.id}:matchVol`,
                    value: row.match.vol,
                    tone: getPriceTone(
                        row.match.price,
                        row.ref,
                        row.ceiling,
                        row.floor,
                    ),
                },
                {
                    key: `${row.id}:matchChange`,
                    value: row.match.change,
                    tone: row.match.change >= 0 ? "emerald" : "rose",
                },
                {
                    key: `${row.id}:matchPercent`,
                    value: row.match.percent,
                    tone: row.match.percent >= 0 ? "emerald" : "rose",
                },
                {
                    key: `${row.id}:totalVol`,
                    value: row.totalVol,
                    tone: "slate",
                },
                {
                    key: `${row.id}:high`,
                    value: row.high,
                    tone: "emerald",
                },
                { key: `${row.id}:low`, value: row.low, tone: "amber" },
            );
            for (let i = 0; i < 3; i += 1) {
                const buy = row.buy[i];
                const sell = row.sell[i];
                snapshots.push(
                    {
                        key: `${row.id}:buy${i}Price`,
                        value: buy?.price ?? 0,
                        tone: getPriceTone(
                            buy?.price ?? 0,
                            row.ref,
                            row.ceiling,
                            row.floor,
                        ),
                    },
                    {
                        key: `${row.id}:buy${i}Vol`,
                        value: buy?.vol ?? "0",
                        tone: getPriceTone(
                            buy?.price ?? 0,
                            row.ref,
                            row.ceiling,
                            row.floor,
                        ),
                    },
                    {
                        key: `${row.id}:sell${i}Price`,
                        value: sell?.price ?? 0,
                        tone: getPriceTone(
                            sell?.price ?? 0,
                            row.ref,
                            row.ceiling,
                            row.floor,
                        ),
                    },
                    {
                        key: `${row.id}:sell${i}Vol`,
                        value: sell?.vol ?? "0",
                        tone: getPriceTone(
                            sell?.price ?? 0,
                            row.ref,
                            row.ceiling,
                            row.floor,
                        ),
                    },
                );
            }
        }
        return snapshots;
    }, [rowsForTable]);

    useEffect(() => {
        const now = Date.now();
        const prev = prevCellValuesRef.current;
        const nextValues: Record<string, number | string> = {};
        const updates: Record<string, CellFlashState> = {};

        for (const cell of rowCellSnapshots) {
            const prevValue = prev[cell.key];
            nextValues[cell.key] = cell.value;
            if (prevValue !== undefined && !Object.is(prevValue, cell.value)) {
                updates[cell.key] = {
                    until: now + BOARD_CELL_FLASH_MS,
                    tone: cell.tone,
                };
            }
        }

        prevCellValuesRef.current = nextValues;
        if (!Object.keys(updates).length) return;

        setCellFlashes((prevFlashes) => {
            const next = { ...prevFlashes };
            for (const [cellKey, flash] of Object.entries(updates)) {
                next[cellKey] = flash;
            }
            return next;
        });
    }, [rowCellSnapshots]);

    useEffect(() => {
        if (!Object.keys(cellFlashes).length) return;
        const timer = window.setInterval(() => {
            const now = Date.now();
            setCellFlashes((prevFlashes) => {
                let changed = false;
                const next: Record<string, CellFlashState> = {};
                for (const [cellKey, flash] of Object.entries(prevFlashes)) {
                    if (flash.until > now) {
                        next[cellKey] = flash;
                    } else {
                        changed = true;
                    }
                }
                return changed ? next : prevFlashes;
            });
        }, 120);

        return () => window.clearInterval(timer);
    }, [cellFlashes]);

    const flashClass = useCallback(
        (cellKey: string) => {
            const flash = cellFlashes[cellKey];
            return flash ? FLASH_BG_CLASS_BY_TONE[flash.tone] : "";
        },
        [cellFlashes],
    );

    const isFlashing = useCallback(
        (cellKey: string) => Boolean(cellFlashes[cellKey]),
        [cellFlashes],
    );

    const cycleBoardSort = useCallback((key: BoardSortKey) => {
        setBoardSort((prev) => {
            if (!prev || prev.key !== key) return { key, dir: "asc" };
            if (prev.dir === "asc") return { key, dir: "desc" };
            return null;
        });
    }, []);

    const headerSortClick = useCallback(
        (key: BoardSortKey) => (e: React.MouseEvent) => {
            if ((e.target as HTMLElement).closest(".cursor-col-resize")) {
                return;
            }
            cycleBoardSort(key);
        },
        [cycleBoardSort],
    );

    const sortGlyph = useCallback(
        (key: BoardSortKey) => {
            if (!boardSort || boardSort.key !== key) return null;
            return boardSort.dir === "asc" ? (
                <ArrowUp className="shrink-0 opacity-70" size={10} />
            ) : (
                <ArrowDown className="shrink-0 opacity-70" size={10} />
            );
        },
        [boardSort],
    );

    const sortableHeaderClass =
        "cursor-pointer select-none hover:bg-accent/25 transition-colors";

    const goToHomeWithStock = useCallback(
        (assetId: string) => {
            if (assetId === "EMPTY") return;
            setSelectedSymbol(assetId);
            router.push("/");
        },
        [router, setSelectedSymbol],
    );

    const streamStatusClass =
        streamStatus === "connected"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
            : streamStatus === "error"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
              : "border-amber-500/30 bg-amber-500/10 text-amber-500";
    const streamStatusLabel =
        streamStatus === "connected"
            ? "Socket: connected"
            : streamStatus === "error"
              ? "Socket: error"
              : "Socket: connecting";
    const snapshotStatusClass =
        isVietcapSnapshotLoading && vietcapSnapshotCount === 0
            ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
            : vietcapSnapshotError
              ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
              : "border-sky-500/30 bg-sky-500/10 text-sky-500";
    const snapshotStatusLabel =
        isVietcapSnapshotLoading && vietcapSnapshotCount === 0
            ? "Vietcap snapshot: loading"
            : vietcapSnapshotError
              ? "Vietcap snapshot: error"
              : `Vietcap snapshot: ${vietcapSnapshotCount} mã`;

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-main text-main">
            <AppTopBar
                refreshTitle="Refresh board"
                refreshAriaLabel="Refresh board"
            />

            {universe !== "stock" ? (
                <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-10 sm:py-14">
                    <div className="w-full max-w-[420px] space-y-6 px-8 py-10 text-center sm:px-10 sm:py-12">
                        <div className="flex justify-center">
                            <Image
                                src="/loading.gif"
                                alt="Loading"
                                width={100}
                                height={100}
                                className="rounded-sm"
                                unoptimized
                                priority
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                                Coming soon
                            </p>
                            <h2 className="text-[15px] font-semibold tracking-tight text-main">
                                Board
                            </h2>
                            <p className="text-[12px] leading-relaxed text-muted">
                                This section is under development. Check back
                                later for updates.
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-accent/90"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex gap-2 overflow-x-auto border-b border-main bg-main px-2 py-2 thin-scrollbar">
                        <MiniChart
                            data={chartData.VNINDEX}
                            color="#10b981"
                            title="VNINDEX"
                            stats={indexByName.VNINDEX ?? EMPTY_INDEX_STATS}
                        />
                        <MiniChart
                            data={chartData.VN30}
                            color="#10b981"
                            title="VN30"
                            stats={indexByName.VN30 ?? EMPTY_INDEX_STATS}
                        />
                        <MiniChart
                            data={chartData.HNX30}
                            color="#10b981"
                            title="HNX30"
                            stats={indexByName.HNX30 ?? EMPTY_INDEX_STATS}
                        />
                        <MiniChart
                            data={chartData.VNXALL}
                            color="#10b981"
                            title="VNXALL"
                            stats={indexByName.VNXALL ?? EMPTY_INDEX_STATS}
                        />

                        <div className="w-[360px] shrink-0 rounded-sm border border-main bg-secondary p-2">
                            <table className="w-full text-[10px]">
                                <thead>
                                    <tr className="border-b border-main text-muted">
                                        <th className="p-1 text-left font-medium">
                                            Chỉ số
                                        </th>
                                        <th className="p-1 text-right font-medium">
                                            Điểm
                                        </th>
                                        <th className="p-1 text-right font-medium">
                                            +/-
                                        </th>
                                        <th className="p-1 text-right font-medium">
                                            KLGD
                                        </th>
                                        <th className="p-1 text-right font-medium">
                                            GTGD
                                        </th>
                                        <th className="p-1 text-right font-medium">
                                            T/G
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {indexRows.map((idx) => (
                                        <tr
                                            key={idx.name}
                                            className="border-b border-main hover:bg-main/20"
                                        >
                                            <td className="p-1 font-semibold">
                                                {idx.name}
                                            </td>
                                            <td
                                                className={cn(
                                                    "p-1 text-right font-bold",
                                                    idx.change >= 0
                                                        ? "text-emerald-500"
                                                        : "text-rose-500",
                                                )}
                                            >
                                                {idx.value.toLocaleString()}
                                            </td>
                                            <td
                                                className={cn(
                                                    "p-1 text-right",
                                                    idx.change >= 0
                                                        ? "text-emerald-500"
                                                        : "text-rose-500",
                                                )}
                                            >
                                                {formatBoardSignedPriceDisplay(
                                                    idx.change,
                                                )}
                                            </td>
                                            <td className="p-1 text-right">
                                                {idx.vol}
                                            </td>
                                            <td className="p-1 text-right">
                                                {idx.valueT}
                                            </td>
                                            <td className="p-1 text-right">
                                                <span className="text-emerald-500">
                                                    {idx.up}
                                                </span>
                                                <span className="px-1 text-amber-500">
                                                    {idx.ref}
                                                </span>
                                                <span className="text-rose-500">
                                                    {idx.down}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="sticky top-0 z-20 flex h-11 items-center gap-3 border-b border-main bg-secondary px-2">
                        <div className="relative w-full max-w-xs">
                            <Search
                                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted"
                                size={14}
                            />
                            <input
                                type="text"
                                placeholder="Tìm kiếm mã CK"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-md border border-main bg-main px-8 py-1.5 text-xs focus:border-accent focus:outline-none"
                            />
                        </div>

                        <div className="flex h-full items-center gap-1 overflow-x-auto thin-scrollbar">
                            {[
                                "Danh mục của tôi",
                                "VN30",
                                "HNX30",
                                "HOSE",
                                "HNX",
                                "UPCOM",
                                "CP Ngành",
                                "ETF",
                            ].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "h-full whitespace-nowrap border-b-2 px-3 text-[11px] font-semibold transition-colors",
                                        activeTab === tab
                                            ? "border-emerald-500 text-emerald-500"
                                            : "border-transparent text-muted hover:text-main",
                                    )}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {tab}
                                        {[
                                            "VN30",
                                            "HNX30",
                                            "HOSE",
                                            "HNX",
                                            "UPCOM",
                                            "CP Ngành",
                                            "ETF",
                                        ].includes(tab) && (
                                            <ChevronDown size={11} />
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <div className="hidden lg:flex items-center gap-2">
                                <span
                                    className={cn(
                                        "rounded-sm border px-2 py-0.5 text-[10px] font-semibold",
                                        streamStatusClass,
                                    )}
                                >
                                    {streamStatusLabel}
                                </span>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className="rounded-md p-1.5 text-muted hover:bg-main hover:text-main"
                                title="Toggle theme"
                            >
                                {isLight ? (
                                    <Moon size={14} />
                                ) : (
                                    <Sun size={14} />
                                )}
                            </button>
                            <button className="rounded-md p-1.5 text-muted hover:bg-main hover:text-main">
                                <ArrowUp size={14} />
                            </button>
                            <button className="rounded-md p-1.5 text-muted hover:bg-main hover:text-main">
                                <LayoutGrid size={14} />
                            </button>
                            <button className="rounded-md p-1.5 text-muted hover:bg-main hover:text-main">
                                <Settings size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto pb-8 thin-scrollbar">
                        <table className="w-full min-w-[1500px] table-fixed border-separate border-spacing-0 text-[11px]">
                            <colgroup>
                                {colWidths.map((width, index) => (
                                    <col
                                        key={`board-col-${index}`}
                                        style={{ width }}
                                    />
                                ))}
                            </colgroup>
                            <thead className="sticky top-0 z-10 bg-secondary [&_th]:bg-secondary">
                                <tr className="border-b border-main text-muted leading-none">
                                    <th
                                        rowSpan={2}
                                        className={cn(
                                            "relative min-w-[90px] border-r border-b border-main p-2",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("ticker")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            CK
                                            {sortGlyph("ticker")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(0, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className={cn(
                                            "relative border-r border-b border-main p-2",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("ceiling")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Trần
                                            {sortGlyph("ceiling")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(1, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className={cn(
                                            "relative border-r border-b border-main p-2",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("floor")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Sàn
                                            {sortGlyph("floor")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(2, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className={cn(
                                            "relative border-r border-b border-main p-2",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("ref")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            TC
                                            {sortGlyph("ref")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(3, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        colSpan={6}
                                        className="border-r border-main border-b border-main p-2 text-center"
                                    >
                                        Bên mua
                                    </th>
                                    <th
                                        colSpan={4}
                                        className="border-r border-main border-b border-main p-1 text-center"
                                    >
                                        Khớp lệnh
                                    </th>
                                    <th
                                        colSpan={6}
                                        className="border-r border-main border-b border-main p-1 text-center"
                                    >
                                        Bên bán
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className={cn(
                                            "relative border-r border-b border-main p-2",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("totalVol")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Tổng KL
                                            {sortGlyph("totalVol")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(20, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className={cn(
                                            "relative border-r border-b border-main p-2",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("high")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Cao
                                            {sortGlyph("high")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(21, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className={cn(
                                            "relative border-r border-b border-main p-2",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("low")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Thấp
                                            {sortGlyph("low")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(22, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        colSpan={3}
                                        className="border-b border-main p-1 text-center"
                                    >
                                        ĐTNN
                                    </th>
                                </tr>
                                <tr className="border-b border-main text-[10px] text-muted leading-none">
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("buy0Price")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Giá 3{sortGlyph("buy0Price")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(4, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("buy0Vol")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            KL 3{sortGlyph("buy0Vol")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(5, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-2",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("buy1Price")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Giá 2{sortGlyph("buy1Price")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(6, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("buy1Vol")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            KL 2{sortGlyph("buy1Vol")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(7, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("buy2Price")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Giá 1{sortGlyph("buy2Price")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(8, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("buy2Vol")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            KL 1{sortGlyph("buy2Vol")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(9, e)
                                            }
                                        />
                                    </th>

                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("matchPrice")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Giá
                                            {sortGlyph("matchPrice")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(10, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("matchVol")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            KL
                                            {sortGlyph("matchVol")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(11, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("matchChange")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            +/-
                                            {sortGlyph("matchChange")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(12, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick(
                                            "matchPercent",
                                        )}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            +/- (%)
                                            {sortGlyph("matchPercent")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(13, e)
                                            }
                                        />
                                    </th>

                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("sell0Price")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Giá 1{sortGlyph("sell0Price")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(14, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("sell0Vol")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            KL 1{sortGlyph("sell0Vol")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(15, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("sell1Price")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Giá 2{sortGlyph("sell1Price")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(16, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("sell1Vol")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            KL 2{sortGlyph("sell1Vol")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(17, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("sell2Price")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Giá 3{sortGlyph("sell2Price")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(18, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("sell2Vol")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            KL 3{sortGlyph("sell2Vol")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(19, e)
                                            }
                                        />
                                    </th>

                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("foreignBuy")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            NN mua
                                            {sortGlyph("foreignBuy")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(23, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-r border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("foreignSell")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            NN bán
                                            {sortGlyph("foreignSell")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(24, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        className={cn(
                                            "relative border-b border-main p-1",
                                            sortableHeaderClass,
                                        )}
                                        onClick={headerSortClick("foreignRoom")}
                                    >
                                        <span className="inline-flex items-center gap-0.5">
                                            Room
                                            {sortGlyph("foreignRoom")}
                                        </span>
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(25, e)
                                            }
                                        />
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-main">
                                {isLoading
                                    ? Array.from({ length: 20 }).map((_, i) => (
                                          <BoardRowSkeleton
                                              key={i}
                                              index={i}
                                              isLight={isLight}
                                          />
                                      ))
                                    : rowsForTable.map((stock, index) => {
                                          const rowKey = stock.id;
                                          return (
                                              <tr
                                                  key={stock.id}
                                                  className={getRowClassName(
                                                      index,
                                                  )}
                                              >
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 font-semibold",
                                                          stock.id !==
                                                              "EMPTY" &&
                                                              "cursor-pointer hover:bg-accent/15",
                                                      )}
                                                      onClick={() =>
                                                          goToHomeWithStock(
                                                              stock.id,
                                                          )
                                                      }
                                                      title={
                                                          stock.id === "EMPTY"
                                                              ? undefined
                                                              : `Mở ${stock.ticker} trên trang chủ`
                                                      }
                                                  >
                                                      <div className="flex items-center gap-1.5 min-w-0">
                                                          <TokenAvatar
                                                              symbol={
                                                                  stock.ticker
                                                              }
                                                              logoUrl={
                                                                  stock.logoUrl
                                                              }
                                                              size={18}
                                                          />
                                                          <div className="min-w-0">
                                                              <div className="truncate">
                                                                  {stock.ticker}
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right text-fuchsia-500 bg-slate-500/10",
                                                          flashClass(
                                                              `${rowKey}:ceiling`,
                                                          ),
                                                      )}
                                                  >
                                                      {formatBoardPriceDisplay(
                                                          stock.ceiling,
                                                      )}
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right text-cyan-500 bg-slate-500/10",
                                                          flashClass(
                                                              `${rowKey}:floor`,
                                                          ),
                                                      )}
                                                  >
                                                      {formatBoardPriceDisplay(
                                                          stock.floor,
                                                      )}
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right text-amber-500 bg-slate-500/10",
                                                          flashClass(
                                                              `${rowKey}:ref`,
                                                          ),
                                                      )}
                                                  >
                                                      {formatBoardPriceDisplay(
                                                          stock.tc,
                                                      )}
                                                  </td>

                                                  {stock.buy.map((b, i) => {
                                                      const priceKey = `${rowKey}:buy${i}Price`;
                                                      const volKey = `${rowKey}:buy${i}Vol`;
                                                      return (
                                                          <React.Fragment
                                                              key={`${stock.ticker}-buy-${i}`}
                                                          >
                                                              <td
                                                                  className={cn(
                                                                      "border-r border-main p-1 text-right",
                                                                      flashClass(
                                                                          priceKey,
                                                                      ),
                                                                  )}
                                                              >
                                                                  <ColorText
                                                                      value={
                                                                          b.price
                                                                      }
                                                                      refVal={
                                                                          stock.ref
                                                                      }
                                                                      ceiling={
                                                                          stock.ceiling
                                                                      }
                                                                      floor={
                                                                          stock.floor
                                                                      }
                                                                      className={
                                                                          isFlashing(
                                                                              priceKey,
                                                                          )
                                                                              ? "!text-white"
                                                                              : undefined
                                                                      }
                                                                  >
                                                                      {formatBoardPriceDisplay(
                                                                          b.price,
                                                                      )}
                                                                  </ColorText>
                                                              </td>
                                                              <td
                                                                  className={cn(
                                                                      "border-r border-main p-1 text-right",
                                                                      flashClass(
                                                                          volKey,
                                                                      ),
                                                                  )}
                                                              >
                                                                  <ColorText
                                                                      value={
                                                                          b.price
                                                                      }
                                                                      refVal={
                                                                          stock.ref
                                                                      }
                                                                      ceiling={
                                                                          stock.ceiling
                                                                      }
                                                                      floor={
                                                                          stock.floor
                                                                      }
                                                                      className={cn(
                                                                          "font-semibold",
                                                                          isFlashing(
                                                                              volKey,
                                                                          ) &&
                                                                              "!text-white",
                                                                      )}
                                                                  >
                                                                      {formatBoardStringDisplay(
                                                                          b.vol,
                                                                      )}
                                                                  </ColorText>
                                                              </td>
                                                          </React.Fragment>
                                                      );
                                                  })}

                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-1 text-right bg-slate-500/10",
                                                          flashClass(
                                                              `${rowKey}:matchPrice`,
                                                          ),
                                                      )}
                                                  >
                                                      <ColorText
                                                          value={
                                                              stock.match.price
                                                          }
                                                          refVal={stock.ref}
                                                          ceiling={
                                                              stock.ceiling
                                                          }
                                                          floor={stock.floor}
                                                          className={cn(
                                                              "font-semibold",
                                                              isFlashing(
                                                                  `${rowKey}:matchPrice`,
                                                              ) &&
                                                                  "!text-white",
                                                          )}
                                                      >
                                                          {formatBoardPriceDisplay(
                                                              stock.match.price,
                                                          )}
                                                      </ColorText>
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-1 text-right bg-slate-500/10",
                                                          flashClass(
                                                              `${rowKey}:matchVol`,
                                                          ),
                                                      )}
                                                  >
                                                      <ColorText
                                                          value={
                                                              stock.match.price
                                                          }
                                                          refVal={stock.ref}
                                                          ceiling={
                                                              stock.ceiling
                                                          }
                                                          floor={stock.floor}
                                                          className={cn(
                                                              "font-semibold",
                                                              isFlashing(
                                                                  `${rowKey}:matchVol`,
                                                              ) &&
                                                                  "!text-white",
                                                          )}
                                                      >
                                                          {formatBoardStringDisplay(
                                                              stock.match.vol,
                                                          )}
                                                      </ColorText>
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-1 text-right bg-slate-500/10",
                                                          !Number.isFinite(
                                                              stock.match
                                                                  .change,
                                                          )
                                                              ? "text-muted"
                                                              : stock.match
                                                                      .change >=
                                                                  0
                                                                ? "text-emerald-500"
                                                                : "text-rose-500",
                                                          flashClass(
                                                              `${rowKey}:matchChange`,
                                                          ),
                                                      )}
                                                  >
                                                      {formatBoardPriceDisplay(
                                                          stock.match.change,
                                                      )}
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-1 text-right bg-slate-500/10",
                                                          !Number.isFinite(
                                                              stock.match
                                                                  .percent,
                                                          )
                                                              ? "text-muted"
                                                              : stock.match
                                                                      .percent >=
                                                                  0
                                                                ? "text-emerald-500"
                                                                : "text-rose-500",
                                                          flashClass(
                                                              `${rowKey}:matchPercent`,
                                                          ),
                                                      )}
                                                  >
                                                      {formatBoardPercentDisplay(
                                                          stock.match.percent,
                                                      )}
                                                  </td>

                                                  {stock.sell.map((s, i) => {
                                                      const priceKey = `${rowKey}:sell${i}Price`;
                                                      const volKey = `${rowKey}:sell${i}Vol`;
                                                      return (
                                                          <React.Fragment
                                                              key={`${stock.ticker}-sell-${i}`}
                                                          >
                                                              <td
                                                                  className={cn(
                                                                      "border-r border-main p-1 text-right",
                                                                      flashClass(
                                                                          priceKey,
                                                                      ),
                                                                  )}
                                                              >
                                                                  <ColorText
                                                                      value={
                                                                          s.price
                                                                      }
                                                                      refVal={
                                                                          stock.ref
                                                                      }
                                                                      ceiling={
                                                                          stock.ceiling
                                                                      }
                                                                      floor={
                                                                          stock.floor
                                                                      }
                                                                      className={
                                                                          isFlashing(
                                                                              priceKey,
                                                                          )
                                                                              ? "!text-white"
                                                                              : undefined
                                                                      }
                                                                  >
                                                                      {formatBoardPriceDisplay(
                                                                          s.price,
                                                                      )}
                                                                  </ColorText>
                                                              </td>
                                                              <td
                                                                  className={cn(
                                                                      "border-r border-main p-1 text-right",
                                                                      flashClass(
                                                                          volKey,
                                                                      ),
                                                                  )}
                                                              >
                                                                  <ColorText
                                                                      value={
                                                                          s.price
                                                                      }
                                                                      refVal={
                                                                          stock.ref
                                                                      }
                                                                      ceiling={
                                                                          stock.ceiling
                                                                      }
                                                                      floor={
                                                                          stock.floor
                                                                      }
                                                                      className={cn(
                                                                          "font-semibold",
                                                                          isFlashing(
                                                                              volKey,
                                                                          ) &&
                                                                              "!text-white",
                                                                      )}
                                                                  >
                                                                      {formatBoardStringDisplay(
                                                                          s.vol,
                                                                      )}
                                                                  </ColorText>
                                                              </td>
                                                          </React.Fragment>
                                                      );
                                                  })}

                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right bg-slate-500/10",
                                                          flashClass(
                                                              `${rowKey}:totalVol`,
                                                          ),
                                                      )}
                                                  >
                                                      {formatBoardStringDisplay(
                                                          stock.totalVol,
                                                      )}
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right text-emerald-500 bg-slate-500/10",
                                                          flashClass(
                                                              `${rowKey}:high`,
                                                          ),
                                                      )}
                                                  >
                                                      {formatBoardPriceDisplay(
                                                          stock.high,
                                                      )}
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right text-amber-500 bg-slate-500/10",
                                                          flashClass(
                                                              `${rowKey}:low`,
                                                          ),
                                                      )}
                                                  >
                                                      {formatBoardPriceDisplay(
                                                          stock.low,
                                                      )}
                                                  </td>

                                                  <td className="border-r border-main p-1 text-right">
                                                      {formatBoardStringDisplay(
                                                          stock.foreign.buy,
                                                      )}
                                                  </td>
                                                  <td className="border-r border-main p-1 text-right">
                                                      {formatBoardStringDisplay(
                                                          stock.foreign.sell,
                                                      )}
                                                  </td>
                                                  <td className="p-1 text-right">
                                                      {formatBoardStringDisplay(
                                                          stock.foreign.room,
                                                      ) || "--"}
                                                  </td>
                                              </tr>
                                          );
                                      })}
                            </tbody>
                        </table>
                        <div className="border-b border-main bg-main/70 px-2 py-1 text-center">
                            <p className="text-[10px] text-muted">
                                Thank you DNSE Socket + Vietcap Snapshot - Cơ
                                sở: Giá: x1,000 - Khối lượng: x1
                            </p>
                        </div>
                    </div>

                    <TickerBar />
                </>
            )}
        </div>
    );
}
