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

type BoardStockRow = {
    id: string;
    ticker: string;
    name: string;
    logoUrl?: string;
    exchange?: string;
    indexMembership: string[];
    ceiling: number;
    floor: number;
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
    90, 64, 64, 64, 64, 84, 64, 84, 64, 84, 64, 84, 64, 72, 64, 84, 64, 84, 64,
    84, 112, 64, 64, 110, 110, 130,
];

const EMPTY_BOARD_PLACEHOLDER: BoardStockRow = {
    id: "EMPTY",
    ticker: "0",
    name: "0",
    logoUrl: undefined,
    exchange: undefined,
    indexMembership: [],
    ceiling: 0,
    floor: 0,
    ref: 0,
    buy: [
        { price: 0, vol: "0" },
        { price: 0, vol: "0" },
        { price: 0, vol: "0" },
    ],
    match: { price: 0, vol: "0", change: 0, percent: 0 },
    sell: [
        { price: 0, vol: "0" },
        { price: 0, vol: "0" },
        { price: 0, vol: "0" },
    ],
    totalVol: "0",
    high: 0,
    low: 0,
    foreign: { buy: "0", sell: "0", room: "0" },
};

const INDICES: IndexData[] = INDEX_NAMES.map((name) => ({
    name,
    value: 0,
    change: 0,
    vol: "0",
    valueT: "0",
    up: 0,
    ref: 0,
    down: 0,
}));

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
    const safe = Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
    return Math.round(safe).toLocaleString("en-US");
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
            ? "text-fuchsia-500"
            : tone === "cyan"
              ? "text-cyan-500"
              : tone === "emerald"
                ? "text-emerald-500"
                : tone === "rose"
                  ? "text-rose-500"
                  : "text-amber-500";

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
    const percent = (
        (stats.change / (stats.value - stats.change)) *
        100
    ).toFixed(2);

    return (
        <div className="flex-1 min-w-[280px] min-h-[180px] min-w-0 border border-main bg-secondary rounded-sm p-2">
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
                        {stats.value.toLocaleString()} (
                        {isPositive ? `+${stats.change}` : stats.change}{" "}
                        {percent}%)
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
            HNXINDEX: generateChartData(50, 0),
        }),
        [],
    );

    const isLight = theme === "light";
    const getRowClassName = useCallback(
        (index: number) =>
            cn(
                "border-b border-main transition-colors hover:!bg-accent/20",
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

    const filteredAssets = useMemo(
        () =>
            assets.filter((asset) => {
                const symbol = asset.symbol.toLowerCase();
                const name = asset.name.toLowerCase();
                const id = asset.id.toLowerCase();
                const searchMatched = q
                    ? symbol.includes(q) || name.includes(q) || id.includes(q)
                    : true;
                if (!searchMatched) return false;

                const exchange = (asset.stockProfile?.exchange ?? "")
                    .trim()
                    .toUpperCase();
                const indexes = (asset.stockProfile?.indexMembership ?? []).map(
                    (idx) => idx.trim().toUpperCase(),
                );

                if (normalizedTab === "VN30") return indexes.includes("VN30");
                if (normalizedTab === "HNX30") return indexes.includes("HNX30");
                if (normalizedTab === "HOSE")
                    return (
                        exchange.includes("HOSE") ||
                        exchange.includes("HSX") ||
                        exchange === "VN"
                    );
                if (normalizedTab === "HNX") return exchange.includes("HNX");
                if (normalizedTab === "UPCOM")
                    return exchange.includes("UPCOM");

                return true;
            }),
        [assets, normalizedTab, q],
    );

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

    const streamSymbols = useMemo(
        () =>
            filteredAssets
                .map((asset) => asset.symbol.trim().toUpperCase())
                .filter(Boolean),
        [filteredAssets],
    );

    const {
        status: streamStatus,
        error: streamError,
        dataBySymbol,
        isTruncated,
    } = useDnseBoardStream(streamSymbols, {
        board: streamBoards[0] ?? "G1",
        boards: streamBoards,
        marketIndex: "VNINDEX",
        resolution: "1",
    });

    const boardRows = useMemo<BoardStockRow[]>(
        () =>
            filteredAssets.map((asset) => {
                const symbol = asset.symbol.trim().toUpperCase();
                const stream = dataBySymbol[symbol];
                const price = Number.isFinite(asset.price) ? asset.price : 0;
                const change = Number.isFinite(asset.change) ? asset.change : 0;
                const ref = stream?.ref ?? Math.max(0, price - change);
                const mkQty = Number.isFinite(asset.baseVolume)
                    ? asset.baseVolume
                    : 0;
                const matchPrice = stream?.price ?? price;
                const matchChange = ref > 0 ? matchPrice - ref : 0;
                const matchPercent = ref > 0 ? (matchChange / ref) * 100 : 0;

                const buy = Array.from({ length: 3 }, (_, idx) => {
                    const level = stream?.bid?.[2 - idx];
                    return {
                        price: level?.price ?? 0,
                        vol: formatBoardVolume(level?.quantity),
                    };
                });
                const sell = Array.from({ length: 3 }, (_, idx) => {
                    const level = stream?.offer?.[idx];
                    return {
                        price: level?.price ?? 0,
                        vol: formatBoardVolume(level?.quantity),
                    };
                });
                return {
                    id: asset.id,
                    ticker: asset.symbol,
                    name: asset.name || asset.symbol,
                    logoUrl: asset.logoUrl,
                    exchange: asset.stockProfile?.exchange,
                    indexMembership: asset.stockProfile?.indexMembership ?? [],
                    ceiling: stream?.ceiling ?? 0,
                    floor: stream?.floor ?? 0,
                    ref,
                    buy,
                    match: {
                        price: matchPrice,
                        vol: formatBoardVolume(stream?.quantity ?? mkQty),
                        change: Number.isFinite(matchChange) ? matchChange : 0,
                        percent: Number.isFinite(matchPercent)
                            ? matchPercent
                            : 0,
                    },
                    sell,
                    totalVol: formatBoardVolume(stream?.totalVolumeTraded ?? mkQty),
                    high:
                        stream?.highestPrice ??
                        (Number.isFinite(asset.high24h) ? asset.high24h : 0),
                    low:
                        stream?.lowestPrice ??
                        (Number.isFinite(asset.low24h) ? asset.low24h : 0),
                    foreign: { buy: "0", sell: "0", room: "0" },
                };
            }),
        [dataBySymbol, filteredAssets],
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
                { key: `${row.id}:ref`, value: row.ref, tone: "amber" },
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
                    tone: "emerald",
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
                        tone: "emerald",
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
                        tone: "rose",
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
            if (prevValue !== undefined && prevValue !== cell.value) {
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
            ? "DNSE: connected"
            : streamStatus === "error"
              ? "DNSE: error"
              : "DNSE: connecting";

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
                            stats={INDICES[0]}
                        />
                        <MiniChart
                            data={chartData.VN30}
                            color="#10b981"
                            title="VN30"
                            stats={INDICES[1]}
                        />
                        <MiniChart
                            data={chartData.HNX30}
                            color="#10b981"
                            title="HNX30"
                            stats={INDICES[2]}
                        />
                        <MiniChart
                            data={chartData.HNXINDEX}
                            color="#10b981"
                            title="HNXINDEX"
                            stats={INDICES[4]}
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
                                    {INDICES.map((idx) => (
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
                                                {idx.change >= 0
                                                    ? `+${idx.change}`
                                                    : idx.change}
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
                                {isTruncated ? (
                                    <span className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-500">
                                        Limit stream 300 mã
                                    </span>
                                ) : null}
                                {streamError ? (
                                    <span className="max-w-[220px] truncate rounded-sm border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-500">
                                        {streamError}
                                    </span>
                                ) : null}
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
                                            "relative border-r border-b border-main p-2 text-fuchsia-500",
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
                                            "relative border-r border-b border-main p-2 text-cyan-500",
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
                                            "relative border-r border-b border-main p-2 text-amber-500",
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
                                                          stock.id !== "EMPTY" &&
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
                                                          "border-r border-main p-2 text-right text-fuchsia-500",
                                                          flashClass(
                                                              `${rowKey}:ceiling`,
                                                          ),
                                                      )}
                                                  >
                                                      {stock.ceiling.toFixed(2)}
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right text-cyan-500",
                                                          flashClass(
                                                              `${rowKey}:floor`,
                                                          ),
                                                      )}
                                                  >
                                                      {stock.floor.toFixed(2)}
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right text-amber-500",
                                                          flashClass(
                                                              `${rowKey}:ref`,
                                                          ),
                                                      )}
                                                  >
                                                      {stock.ref.toFixed(2)}
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
                                                                      {b.price.toFixed(
                                                                          2,
                                                                      )}
                                                                  </ColorText>
                                                              </td>
                                                              <td
                                                                  className={cn(
                                                                      "border-r border-main p-1 text-right font-semibold text-emerald-500",
                                                                      flashClass(
                                                                          volKey,
                                                                      ),
                                                                  )}
                                                              >
                                                                  {b.vol}
                                                              </td>
                                                          </React.Fragment>
                                                      );
                                                  })}

                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-1 text-right",
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
                                                          ceiling={stock.ceiling}
                                                          floor={stock.floor}
                                                          className={cn(
                                                              "font-semibold",
                                                              isFlashing(
                                                                  `${rowKey}:matchPrice`,
                                                              ) && "!text-white",
                                                          )}
                                                      >
                                                          {stock.match.price.toFixed(
                                                              2,
                                                          )}
                                                      </ColorText>
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-1 text-right font-semibold text-emerald-500",
                                                          flashClass(
                                                              `${rowKey}:matchVol`,
                                                          ),
                                                      )}
                                                  >
                                                      {stock.match.vol}
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-1 text-right",
                                                          stock.match.change >= 0
                                                              ? "text-emerald-500"
                                                              : "text-rose-500",
                                                          flashClass(
                                                              `${rowKey}:matchChange`,
                                                          ),
                                                      )}
                                                  >
                                                      {stock.match.change.toFixed(
                                                          2,
                                                      )}
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-1 text-right",
                                                          stock.match.percent >=
                                                              0
                                                              ? "text-emerald-500"
                                                              : "text-rose-500",
                                                          flashClass(
                                                              `${rowKey}:matchPercent`,
                                                          ),
                                                      )}
                                                  >
                                                      {stock.match.percent.toFixed(
                                                          2,
                                                      )}
                                                      %
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
                                                                      {s.price.toFixed(
                                                                          2,
                                                                      )}
                                                                  </ColorText>
                                                              </td>
                                                              <td
                                                                  className={cn(
                                                                      "border-r border-main p-1 text-right font-semibold text-rose-500",
                                                                      flashClass(
                                                                          volKey,
                                                                      ),
                                                                  )}
                                                              >
                                                                  {s.vol}
                                                              </td>
                                                          </React.Fragment>
                                                      );
                                                  })}

                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right",
                                                          flashClass(
                                                              `${rowKey}:totalVol`,
                                                          ),
                                                      )}
                                                  >
                                                      {stock.totalVol}
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right text-emerald-500",
                                                          flashClass(
                                                              `${rowKey}:high`,
                                                          ),
                                                      )}
                                                  >
                                                      {stock.high.toFixed(2)}
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right text-amber-500",
                                                          flashClass(
                                                              `${rowKey}:low`,
                                                          ),
                                                      )}
                                                  >
                                                      {stock.low.toFixed(2)}
                                                  </td>

                                                  <td className="border-r border-main p-1 text-right">
                                                      {stock.foreign.buy}
                                                  </td>
                                                  <td className="border-r border-main p-1 text-right">
                                                      {stock.foreign.sell}
                                                  </td>
                                                  <td className="p-1 text-right">
                                                      {stock.foreign.room ||
                                                          "--"}
                                                  </td>
                                              </tr>
                                          );
                                      })}
                            </tbody>
                        </table>
                    </div>

                    <TickerBar />
                </>
            )}
        </div>
    );
}
