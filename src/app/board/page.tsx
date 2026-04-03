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
    ArrowUpRight,
    ArrowDownRight,
    Clock,
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
import { useVietcapMarketIndexes } from "../../hooks/useVietcapMarketIndexes";

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
    priceScale: {
        ceilingFromDnse: boolean;
        floorFromDnse: boolean;
        tcFromDnse: boolean;
        buyFromDnse: [boolean, boolean, boolean];
        matchPriceFromDnse: boolean;
        matchChangeFromDnse: boolean;
        sellFromDnse: [boolean, boolean, boolean];
        highFromDnse: boolean;
        lowFromDnse: boolean;
    };
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
    ceiling: number;
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

const INDEX_NAMES = ["VNINDEX", "VN30", "HNX30", "HNXINDEX", "UPCOM"];
const INITIAL_COL_WIDTHS = [
    70, 50, 50, 50, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 64, 60, 60, 60, 60,
    70, 90, 64, 64, 82, 82, 94,
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
    priceScale: {
        ceilingFromDnse: false,
        floorFromDnse: false,
        tcFromDnse: false,
        buyFromDnse: [false, false, false],
        matchPriceFromDnse: false,
        matchChangeFromDnse: false,
        sellFromDnse: [false, false, false],
        highFromDnse: false,
        lowFromDnse: false,
    },
};

const EMPTY_INDEX_STATS: IndexData = {
    name: "",
    value: 0,
    change: 0,
    vol: "0",
    valueT: "0",
    ceiling: 0,
    up: 0,
    ref: 0,
    down: 0,
};

const BOARD_CELL_FLASH_MS = 900;
const STOCK_LAMBDA_URL = process.env.NEXT_PUBLIC_STOCK_LAMBDA_URL?.trim() || "";
const BOARD_RECENTS_KEY = "fintrace_board_recent_symbols";
const BOARD_MAX_RECENTS = 8;
const BOARD_PRICE_SCALE_FACTOR = 1000;
const DNSE_SOCKET_VOLUME_MULTIPLIER = 10;

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

function formatBoardPriceDisplay(value: number, fromDnse = false): string {
    if (!Number.isFinite(value)) return "";
    const displayValue = fromDnse ? value : value / 1000;
    return displayValue.toFixed(2);
}

function resolveBoardStockLogoUrl(symbol: string): string {
    const ticker = symbol.trim().toUpperCase();
    const encoded = encodeURIComponent(ticker);
    if (!STOCK_LAMBDA_URL) {
        return `/stock/image/${encoded}`;
    }
    const normalized = STOCK_LAMBDA_URL.replace(/\/+$/, "");
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
        return `${normalized}/image/${encoded}`;
    }
    if (normalized.startsWith("/")) {
        return `${normalized}/image/${encoded}`;
    }
    return `/stock/image/${encoded}`;
}

function loadBoardRecentSymbols(): string[] {
    try {
        const raw = localStorage.getItem(BOARD_RECENTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((item) =>
                String(item || "")
                    .trim()
                    .toUpperCase(),
            )
            .filter((item) => /^[A-Z0-9]{1,12}$/.test(item))
            .slice(0, BOARD_MAX_RECENTS);
    } catch {
        return [];
    }
}

function saveBoardRecentSymbols(symbols: string[]) {
    try {
        localStorage.setItem(BOARD_RECENTS_KEY, JSON.stringify(symbols));
    } catch {
        // localStorage unavailable
    }
}

function formatBoardSignedPriceDisplay(
    value: number,
    fromDnse = false,
): string {
    if (!Number.isFinite(value)) return "";
    const scaled = fromDnse ? value : value / 1000;
    return `${scaled >= 0 ? "+" : ""}${scaled.toFixed(2)}`;
}

function formatIndexSignedDisplay(value: number): string {
    if (!Number.isFinite(value)) return "";
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatBoardPercentDisplay(value: number): string {
    return Number.isFinite(value)
        ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
        : "";
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
    const EPS = 1e-6;
    if (Number.isFinite(ceiling) && Math.abs(value - ceiling) <= EPS) {
        return "fuchsia";
    }
    if (Number.isFinite(floor) && Math.abs(value - floor) <= EPS) {
        return "cyan";
    }
    if (Number.isFinite(refVal) && value > refVal + EPS) return "emerald";
    if (Number.isFinite(refVal) && value < refVal - EPS) return "rose";
    return "amber";
}

function normalizeToneComparator(
    valueFromDnse: boolean,
    comparator: number,
    comparatorFromDnse: boolean,
): number {
    if (!Number.isFinite(comparator)) return Number.NaN;
    if (valueFromDnse === comparatorFromDnse) return comparator;
    return valueFromDnse
        ? comparator / BOARD_PRICE_SCALE_FACTOR
        : comparator * BOARD_PRICE_SCALE_FACTOR;
}

function toneToTextClass(tone: CellFlashTone): string {
    if (tone === "fuchsia") return "text-[#c05af2]";
    if (tone === "emerald") return "text-[#32d74b]";
    if (tone === "rose") return "text-[#ff2727]";
    if (tone === "amber") return "text-[#ffbe0c]";
    return "text-cyan-500";
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
                        <span className="text-fuchsia-500">
                            ▲ {stats.ceiling}
                        </span>
                        <span className="text-emerald-500">▲ {stats.up}</span>
                        <span className="text-amber-500">■ {stats.ref}</span>
                        <span className="text-rose-500">▼ {stats.down}</span>
                    </div>
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
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [recentSymbols, setRecentSymbols] = useState<string[]>([]);
    const [highlightedSymbol, setHighlightedSymbol] = useState<string | null>(
        null,
    );
    const [pendingHighlightSymbol, setPendingHighlightSymbol] = useState<
        string | null
    >(null);
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
    const highlightTimeoutRef = useRef<number | null>(null);
    const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
    const searchContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (assets.length > 0) {
            setIsLoading(false);
        }
        const timer = setTimeout(() => setIsLoading(false), 3000);
        return () => clearTimeout(timer);
    }, [assets.length]);

    useEffect(() => {
        setRecentSymbols(loadBoardRecentSymbols());
    }, []);

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (
                searchContainerRef.current &&
                target &&
                !searchContainerRef.current.contains(target)
            ) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, []);

    const chartData = useMemo(
        () => ({
            VNINDEX: generateChartData(50, 0),
            VN30: generateChartData(50, 0),
            HNX30: generateChartData(50, 0),
            VNXALL: generateChartData(50, 0),
            HNXINDEX: generateChartData(50, 0),
            UPCOM: generateChartData(50, 0),
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

    const symbols = useMemo(
        () =>
            Object.keys(vietcapSnapshotBySymbol).map((s) =>
                s.trim().toUpperCase(),
            ),
        [vietcapSnapshotBySymbol],
    );
    const tabFilteredSymbols = useMemo(() => {
        const tabGroups = new Set(["VN30", "HNX30", "HOSE", "HNX", "UPCOM"]);

        return symbols.filter((symbol) => {
            if (!tabGroups.has(normalizedTab)) return true;
            const groups = (vietcapGroupsBySymbol[symbol] || []).map((g) =>
                g.trim().toUpperCase(),
            );
            return groups.includes(normalizedTab);
        });
    }, [normalizedTab, symbols, vietcapGroupsBySymbol]);
    const searchResults = useMemo(() => {
        if (!q) return [];
        return symbols
            .filter((symbol) => {
                const snapshot = vietcapSnapshotBySymbol[symbol];
                const asset = assetBySymbol.get(symbol);
                const name = (
                    snapshot?.companyName ||
                    asset?.name ||
                    symbol
                ).toLowerCase();
                const id = (asset?.id || symbol).toLowerCase();
                return (
                    symbol.toLowerCase().includes(q) ||
                    name.includes(q) ||
                    id.includes(q)
                );
            })
            .slice(0, 12)
            .map((symbol) => {
                const groups = (vietcapGroupsBySymbol[symbol] || []).map((g) =>
                    g.trim().toUpperCase(),
                );
                return {
                    symbol,
                    name:
                        vietcapSnapshotBySymbol[symbol]?.companyName ||
                        assetBySymbol.get(symbol)?.name ||
                        symbol,
                    groups,
                };
            });
    }, [
        assetBySymbol,
        q,
        symbols,
        vietcapGroupsBySymbol,
        vietcapSnapshotBySymbol,
    ]);
    const recentSearchResults = useMemo(
        () =>
            recentSymbols
                .map((symbol) => {
                    const normalized = symbol.trim().toUpperCase();
                    const groups = (
                        vietcapGroupsBySymbol[normalized] || []
                    ).map((g) => g.trim().toUpperCase());
                    const name =
                        vietcapSnapshotBySymbol[normalized]?.companyName ||
                        assetBySymbol.get(normalized)?.name ||
                        normalized;
                    if (!normalized) return null;
                    return { symbol: normalized, name, groups };
                })
                .filter(Boolean)
                .slice(0, BOARD_MAX_RECENTS),
        [
            assetBySymbol,
            recentSymbols,
            vietcapGroupsBySymbol,
            vietcapSnapshotBySymbol,
        ],
    );

    const streamSymbols = useMemo(
        () => tabFilteredSymbols.filter(Boolean),
        [tabFilteredSymbols],
    );

    const {
        status: streamStatus,
        error: streamError,
        dataBySymbol,
        isTruncated,
    } = useDnseBoardStream(streamSymbols, {
        board: streamBoards[0] ?? "G1",
        boards: streamBoards,
        resolution: "1",
    });
    const {
        bySymbol: vietcapMarketIndexBySymbol,
        count: vietcapMarketIndexCount,
        isLoading: isVietcapMarketIndexLoading,
        error: vietcapMarketIndexError,
    } = useVietcapMarketIndexes({
        enabled: universe === "stock",
        refreshIntervalMs: 45_000,
    });

    const indexRows = useMemo<IndexData[]>(
        () =>
            INDEX_NAMES.map((name) => {
                const market = vietcapMarketIndexBySymbol[name];
                const value = Number.isFinite(market?.value)
                    ? market!.value
                    : 0;
                const change = Number.isFinite(market?.change)
                    ? market!.change
                    : 0;
                const volRaw = Number.isFinite(market?.totalShares)
                    ? market!.totalShares
                    : 0;
                const valueTRaw = Number.isFinite(market?.totalValue)
                    ? market!.totalValue
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
                    ceiling: Number.isFinite(market?.totalStockCeiling)
                        ? Math.round(market!.totalStockCeiling)
                        : 0,
                    up: Number.isFinite(market?.totalStockIncrease)
                        ? Math.round(market!.totalStockIncrease)
                        : 0,
                    ref: Number.isFinite(market?.totalStockNoChange)
                        ? Math.round(market!.totalStockNoChange)
                        : 0,
                    down: Number.isFinite(market?.totalStockDecline)
                        ? Math.round(market!.totalStockDecline)
                        : 0,
                };
            }),
        [vietcapMarketIndexBySymbol],
    );
    const indexByName = useMemo(
        () => Object.fromEntries(indexRows.map((row) => [row.name, row])),
        [indexRows],
    );

    const boardRows = useMemo<BoardStockRow[]>(
        () =>
            tabFilteredSymbols.map((symbol) => {
                const asset = assetBySymbol.get(symbol);
                const stream = dataBySymbol[symbol];
                const snapshot = vietcapSnapshotBySymbol[symbol];
                const price = Number.isFinite(asset?.price)
                    ? asset!.price
                    : Number.NaN;
                const change = Number.isFinite(asset?.change)
                    ? asset!.change
                    : Number.NaN;
                const streamPrice = Number.isFinite(stream?.price)
                    ? stream!.price
                    : Number.NaN;
                const streamRef = Number.isFinite(stream?.ref)
                    ? stream!.ref
                    : Number.NaN;
                const snapshotPrice = Number.isFinite(snapshot?.price)
                    ? snapshot!.price
                    : Number.NaN;
                const snapshotRef = Number.isFinite(snapshot?.ref)
                    ? snapshot!.ref
                    : Number.NaN;
                const fallbackRef =
                    Number.isFinite(price) && Number.isFinite(change)
                        ? Math.max(0, price - change)
                        : Number.NaN;
                const ref = Number.isFinite(streamRef)
                    ? streamRef
                    : Number.isFinite(snapshotRef)
                      ? snapshotRef
                      : fallbackRef;
                const tc = ref;
                const mkQty = Number.isFinite(asset?.baseVolume)
                    ? asset!.baseVolume
                    : undefined;
                const matchFromDnse = Number.isFinite(streamPrice);
                const matchPrice = matchFromDnse
                    ? streamPrice
                    : Number.isFinite(snapshotPrice)
                      ? snapshotPrice
                      : price;
                const matchRef = matchFromDnse
                    ? Number.isFinite(streamRef)
                        ? streamRef
                        : Number.isFinite(snapshotRef)
                          ? snapshotRef / 1000
                          : Number.isFinite(fallbackRef)
                            ? fallbackRef / 1000
                            : Number.NaN
                    : Number.isFinite(snapshotPrice)
                      ? snapshotRef
                      : fallbackRef;
                const matchChange =
                    Number.isFinite(matchRef) && Number.isFinite(matchPrice)
                        ? matchPrice - matchRef
                        : Number.NaN;
                const matchPercent =
                    Number.isFinite(matchRef) &&
                    matchRef > 0 &&
                    Number.isFinite(matchChange)
                        ? (matchChange / matchRef) * 100
                        : Number.NaN;

                const buy = Array.from({ length: 3 }, (_, idx) => {
                    const streamLevel = stream?.bid?.[2 - idx];
                    const snapshotLevel = snapshot?.bid?.[2 - idx];
                    return {
                        price:
                            (Number.isFinite(streamLevel?.price)
                                ? streamLevel!.price
                                : snapshotLevel?.price) ?? Number.NaN,
                        vol: formatBoardVolume(
                            Number.isFinite(streamLevel?.quantity)
                                ? streamLevel!.quantity *
                                      DNSE_SOCKET_VOLUME_MULTIPLIER
                                : snapshotLevel?.quantity,
                        ),
                    };
                });
                const sell = Array.from({ length: 3 }, (_, idx) => {
                    const streamLevel = stream?.offer?.[idx];
                    const snapshotLevel = snapshot?.offer?.[idx];
                    return {
                        price:
                            (Number.isFinite(streamLevel?.price)
                                ? streamLevel!.price
                                : snapshotLevel?.price) ?? Number.NaN,
                        vol: formatBoardVolume(
                            Number.isFinite(streamLevel?.quantity)
                                ? streamLevel!.quantity *
                                      DNSE_SOCKET_VOLUME_MULTIPLIER
                                : snapshotLevel?.quantity,
                        ),
                    };
                });
                const snapshotHigh = Number.isFinite(snapshot?.highestPrice)
                    ? snapshot!.highestPrice
                    : Number.NaN;
                const streamHigh = Number.isFinite(stream?.highestPrice)
                    ? stream!.highestPrice
                    : Number.NaN;
                const snapshotLow = Number.isFinite(snapshot?.lowestPrice)
                    ? snapshot!.lowestPrice
                    : Number.NaN;
                const streamLow = Number.isFinite(stream?.lowestPrice)
                    ? stream!.lowestPrice
                    : Number.NaN;
                const high = Number.isFinite(snapshotHigh)
                    ? snapshotHigh
                    : Number.isFinite(streamHigh)
                      ? streamHigh
                      : Number.isFinite(asset?.high24h)
                        ? asset!.high24h
                        : Number.NaN;
                const low = Number.isFinite(snapshotLow)
                    ? snapshotLow
                    : Number.isFinite(streamLow)
                      ? streamLow
                      : Number.isFinite(asset?.low24h)
                        ? asset!.low24h
                        : Number.NaN;
                return {
                    id: asset?.id || symbol,
                    ticker: symbol,
                    name: snapshot?.companyName || asset?.name || symbol,
                    logoUrl: asset?.logoUrl || resolveBoardStockLogoUrl(symbol),
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
                            Number.isFinite(stream?.quantity)
                                ? stream!.quantity *
                                      DNSE_SOCKET_VOLUME_MULTIPLIER
                                : (snapshot?.quantity ?? mkQty),
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
                    high,
                    low,
                    foreign: {
                        buy: formatBoardVolume(snapshot?.foreignBuy),
                        sell: formatBoardVolume(snapshot?.foreignSell),
                        room: formatBoardVolume(snapshot?.foreignRoom),
                    },
                    priceScale: {
                        ceilingFromDnse: Number.isFinite(stream?.ceiling),
                        floorFromDnse: Number.isFinite(stream?.floor),
                        tcFromDnse: Number.isFinite(stream?.ref),
                        buyFromDnse: [
                            Number.isFinite(stream?.bid?.[2]?.price),
                            Number.isFinite(stream?.bid?.[1]?.price),
                            Number.isFinite(stream?.bid?.[0]?.price),
                        ],
                        matchPriceFromDnse: Number.isFinite(stream?.price),
                        matchChangeFromDnse: matchFromDnse,
                        sellFromDnse: [
                            Number.isFinite(stream?.offer?.[0]?.price),
                            Number.isFinite(stream?.offer?.[1]?.price),
                            Number.isFinite(stream?.offer?.[2]?.price),
                        ],
                        highFromDnse:
                            !Number.isFinite(snapshotHigh) &&
                            Number.isFinite(streamHigh),
                        lowFromDnse:
                            !Number.isFinite(snapshotLow) &&
                            Number.isFinite(streamLow),
                    },
                };
            }),
        [
            assetBySymbol,
            dataBySymbol,
            tabFilteredSymbols,
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
                        normalizeToneComparator(
                            row.priceScale.matchPriceFromDnse,
                            row.ref,
                            row.priceScale.tcFromDnse,
                        ),
                        normalizeToneComparator(
                            row.priceScale.matchPriceFromDnse,
                            row.ceiling,
                            row.priceScale.ceilingFromDnse,
                        ),
                        normalizeToneComparator(
                            row.priceScale.matchPriceFromDnse,
                            row.floor,
                            row.priceScale.floorFromDnse,
                        ),
                    ),
                },
                {
                    key: `${row.id}:matchVol`,
                    value: row.match.vol,
                    tone: getPriceTone(
                        row.match.price,
                        normalizeToneComparator(
                            row.priceScale.matchPriceFromDnse,
                            row.ref,
                            row.priceScale.tcFromDnse,
                        ),
                        normalizeToneComparator(
                            row.priceScale.matchPriceFromDnse,
                            row.ceiling,
                            row.priceScale.ceilingFromDnse,
                        ),
                        normalizeToneComparator(
                            row.priceScale.matchPriceFromDnse,
                            row.floor,
                            row.priceScale.floorFromDnse,
                        ),
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
                    tone: getPriceTone(
                        row.high,
                        normalizeToneComparator(
                            row.priceScale.highFromDnse,
                            row.ref,
                            row.priceScale.tcFromDnse,
                        ),
                        normalizeToneComparator(
                            row.priceScale.highFromDnse,
                            row.ceiling,
                            row.priceScale.ceilingFromDnse,
                        ),
                        normalizeToneComparator(
                            row.priceScale.highFromDnse,
                            row.floor,
                            row.priceScale.floorFromDnse,
                        ),
                    ),
                },
                {
                    key: `${row.id}:low`,
                    value: row.low,
                    tone: getPriceTone(
                        row.low,
                        normalizeToneComparator(
                            row.priceScale.lowFromDnse,
                            row.ref,
                            row.priceScale.tcFromDnse,
                        ),
                        normalizeToneComparator(
                            row.priceScale.lowFromDnse,
                            row.ceiling,
                            row.priceScale.ceilingFromDnse,
                        ),
                        normalizeToneComparator(
                            row.priceScale.lowFromDnse,
                            row.floor,
                            row.priceScale.floorFromDnse,
                        ),
                    ),
                },
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
                            normalizeToneComparator(
                                row.priceScale.buyFromDnse[i],
                                row.ref,
                                row.priceScale.tcFromDnse,
                            ),
                            normalizeToneComparator(
                                row.priceScale.buyFromDnse[i],
                                row.ceiling,
                                row.priceScale.ceilingFromDnse,
                            ),
                            normalizeToneComparator(
                                row.priceScale.buyFromDnse[i],
                                row.floor,
                                row.priceScale.floorFromDnse,
                            ),
                        ),
                    },
                    {
                        key: `${row.id}:buy${i}Vol`,
                        value: buy?.vol ?? "0",
                        tone: getPriceTone(
                            buy?.price ?? 0,
                            normalizeToneComparator(
                                row.priceScale.buyFromDnse[i],
                                row.ref,
                                row.priceScale.tcFromDnse,
                            ),
                            normalizeToneComparator(
                                row.priceScale.buyFromDnse[i],
                                row.ceiling,
                                row.priceScale.ceilingFromDnse,
                            ),
                            normalizeToneComparator(
                                row.priceScale.buyFromDnse[i],
                                row.floor,
                                row.priceScale.floorFromDnse,
                            ),
                        ),
                    },
                    {
                        key: `${row.id}:sell${i}Price`,
                        value: sell?.price ?? 0,
                        tone: getPriceTone(
                            sell?.price ?? 0,
                            normalizeToneComparator(
                                row.priceScale.sellFromDnse[i],
                                row.ref,
                                row.priceScale.tcFromDnse,
                            ),
                            normalizeToneComparator(
                                row.priceScale.sellFromDnse[i],
                                row.ceiling,
                                row.priceScale.ceilingFromDnse,
                            ),
                            normalizeToneComparator(
                                row.priceScale.sellFromDnse[i],
                                row.floor,
                                row.priceScale.floorFromDnse,
                            ),
                        ),
                    },
                    {
                        key: `${row.id}:sell${i}Vol`,
                        value: sell?.vol ?? "0",
                        tone: getPriceTone(
                            sell?.price ?? 0,
                            normalizeToneComparator(
                                row.priceScale.sellFromDnse[i],
                                row.ref,
                                row.priceScale.tcFromDnse,
                            ),
                            normalizeToneComparator(
                                row.priceScale.sellFromDnse[i],
                                row.ceiling,
                                row.priceScale.ceilingFromDnse,
                            ),
                            normalizeToneComparator(
                                row.priceScale.sellFromDnse[i],
                                row.floor,
                                row.priceScale.floorFromDnse,
                            ),
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

    const triggerHighlight = useCallback((symbol: string) => {
        setHighlightedSymbol(symbol);
        const row = rowRefs.current[symbol];
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (highlightTimeoutRef.current !== null) {
            window.clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = window.setTimeout(() => {
            setHighlightedSymbol((prev) => (prev === symbol ? null : prev));
            highlightTimeoutRef.current = null;
        }, 2000);
    }, []);

    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current !== null) {
                window.clearTimeout(highlightTimeoutRef.current);
                highlightTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!pendingHighlightSymbol) return;
        const exists = rowsForTable.some(
            (row) => row.ticker === pendingHighlightSymbol,
        );
        if (!exists) return;
        triggerHighlight(pendingHighlightSymbol);
        setPendingHighlightSymbol(null);
    }, [pendingHighlightSymbol, rowsForTable, triggerHighlight]);

    const resolveTabForSymbol = useCallback(
        (symbol: string): string => {
            const normalized = symbol.trim().toUpperCase();
            const groups = (vietcapGroupsBySymbol[normalized] || []).map((g) =>
                g.trim().toUpperCase(),
            );
            const preferredTabs = ["VN30", "HNX30", "HOSE", "HNX", "UPCOM"];
            const exact = preferredTabs.find((tab) => groups.includes(tab));
            if (exact) return exact;
            const exchange = (
                vietcapSnapshotBySymbol[normalized]?.exchange ||
                assetBySymbol.get(normalized)?.stockProfile?.exchange ||
                ""
            )
                .trim()
                .toUpperCase();
            if (exchange === "HNX") return "HNX";
            if (exchange === "UPCOM") return "UPCOM";
            return "HOSE";
        },
        [assetBySymbol, vietcapGroupsBySymbol, vietcapSnapshotBySymbol],
    );

    const handleSearchPick = useCallback(
        (symbol: string) => {
            const normalized = symbol.trim().toUpperCase();
            const targetTab = resolveTabForSymbol(normalized);
            if (targetTab !== activeTab) {
                setActiveTab(targetTab);
            }
            setSearch("");
            setRecentSymbols((prev) => {
                const next = [
                    normalized,
                    ...prev.filter((item) => item !== normalized),
                ].slice(0, BOARD_MAX_RECENTS);
                saveBoardRecentSymbols(next);
                return next;
            });
            setPendingHighlightSymbol(normalized);
        },
        [activeTab, resolveTabForSymbol],
    );

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
                            data={chartData.HNXINDEX}
                            color="#10b981"
                            title="HNXINDEX"
                            stats={indexByName.HNXINDEX ?? EMPTY_INDEX_STATS}
                        />
                        <MiniChart
                            data={chartData.UPCOM}
                            color="#10b981"
                            title="UPCOM"
                            stats={indexByName.UPCOM ?? EMPTY_INDEX_STATS}
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
                                                {formatIndexSignedDisplay(
                                                    idx.change,
                                                )}
                                            </td>
                                            <td className="p-1 text-right">
                                                {idx.vol}
                                            </td>
                                            <td className="p-1 text-right">
                                                {idx.valueT}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="sticky top-0 z-20 flex h-11 items-center gap-3 border-b border-main bg-secondary px-2">
                        <div
                            ref={searchContainerRef}
                            className="relative w-full max-w-xs"
                        >
                            <Search
                                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted"
                                size={14}
                            />
                            <input
                                type="text"
                                placeholder="Tìm kiếm mã CK"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setIsSearchOpen(true);
                                }}
                                onFocus={() => setIsSearchOpen(true)}
                                onClick={() => setIsSearchOpen(true)}
                                onKeyDown={(e) => {
                                    const hasQuery = search.trim().length > 0;
                                    const firstCandidate = hasQuery
                                        ? searchResults[0]?.symbol
                                        : recentSearchResults[0]?.symbol;
                                    if (
                                        e.key === "Enter" &&
                                        Boolean(firstCandidate)
                                    ) {
                                        e.preventDefault();
                                        handleSearchPick(firstCandidate!);
                                        setIsSearchOpen(false);
                                    }
                                }}
                                className="w-full rounded-md border border-main bg-main px-8 py-1.5 text-xs focus:border-accent focus:outline-none"
                            />
                            {isSearchOpen && (
                                <div className="absolute left-0 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-lg border border-main bg-main shadow-2xl z-50">
                                    <div className="max-h-[380px] overflow-y-auto thin-scrollbar">
                                        {search.trim().length > 0 ? (
                                            <>
                                                <div className="px-3 py-2 text-[9px] font-bold text-muted uppercase tracking-widest bg-secondary/20">
                                                    Results (
                                                    {searchResults.length})
                                                </div>
                                                {searchResults.length === 0 ? (
                                                    <div className="p-6 text-center text-muted text-[12px]">
                                                        No stocks found
                                                    </div>
                                                ) : (
                                                    searchResults.map(
                                                        (result) => {
                                                            const asset =
                                                                assetBySymbol.get(
                                                                    result.symbol,
                                                                );
                                                            const changePercent =
                                                                asset?.changePercent ??
                                                                0;
                                                            return (
                                                                <button
                                                                    key={
                                                                        result.symbol
                                                                    }
                                                                    type="button"
                                                                    onMouseDown={(
                                                                        e,
                                                                    ) => {
                                                                        e.preventDefault();
                                                                        handleSearchPick(
                                                                            result.symbol,
                                                                        );
                                                                        setIsSearchOpen(
                                                                            false,
                                                                        );
                                                                    }}
                                                                    className="px-4 py-2.5 flex w-full items-center justify-between hover:bg-secondary transition-colors border-b border-main last:border-0"
                                                                >
                                                                    <div className="flex items-center space-x-3 min-w-0">
                                                                        <TokenAvatar
                                                                            symbol={
                                                                                result.symbol
                                                                            }
                                                                            logoUrl={
                                                                                asset?.logoUrl ||
                                                                                resolveBoardStockLogoUrl(
                                                                                    result.symbol,
                                                                                )
                                                                            }
                                                                            size={
                                                                                28
                                                                            }
                                                                        />
                                                                        <div className="min-w-0 text-left">
                                                                            <div className="flex items-center space-x-1.5">
                                                                                <span className="text-[12px] font-semibold">
                                                                                    {
                                                                                        result.symbol
                                                                                    }
                                                                                </span>
                                                                                <span className="rounded border border-main px-1 py-0 text-[8px] uppercase tracking-wide text-muted">
                                                                                    {result
                                                                                        .groups[0] ||
                                                                                        "HOSE"}
                                                                                </span>
                                                                            </div>
                                                                            <div className="truncate text-[10px] text-muted max-w-[160px]">
                                                                                {
                                                                                    result.name
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right shrink-0">
                                                                        <div className="text-[12px] font-mono font-medium">
                                                                            {Number.isFinite(
                                                                                asset?.price,
                                                                            )
                                                                                ? asset!.price.toLocaleString(
                                                                                      "en-US",
                                                                                      {
                                                                                          maximumFractionDigits: 2,
                                                                                      },
                                                                                  )
                                                                                : "--"}
                                                                        </div>
                                                                        <div
                                                                            className={cn(
                                                                                "text-[9px] mt-0.5 flex items-center justify-end font-semibold",
                                                                                changePercent >=
                                                                                    0
                                                                                    ? "text-emerald-500"
                                                                                    : "text-rose-500",
                                                                            )}
                                                                        >
                                                                            {changePercent >=
                                                                            0 ? (
                                                                                <ArrowUpRight
                                                                                    size={
                                                                                        10
                                                                                    }
                                                                                    className="mr-0.5"
                                                                                />
                                                                            ) : (
                                                                                <ArrowDownRight
                                                                                    size={
                                                                                        10
                                                                                    }
                                                                                    className="mr-0.5"
                                                                                />
                                                                            )}
                                                                            {Math.abs(
                                                                                changePercent,
                                                                            ).toFixed(
                                                                                2,
                                                                            )}
                                                                            %
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        },
                                                    )
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="px-3 py-2 text-[9px] font-bold text-muted uppercase tracking-widest bg-secondary/20 flex items-center gap-1.5">
                                                    Recently Viewed
                                                </div>
                                                {recentSearchResults.length ===
                                                0 ? (
                                                    <div className="p-6 text-center text-muted text-[12px]">
                                                        Chưa có mã gần đây
                                                    </div>
                                                ) : (
                                                    recentSearchResults.map(
                                                        (result) => {
                                                            const asset =
                                                                assetBySymbol.get(
                                                                    result.symbol,
                                                                );
                                                            const changePercent =
                                                                asset?.changePercent ??
                                                                0;
                                                            return (
                                                                <button
                                                                    key={
                                                                        result.symbol
                                                                    }
                                                                    type="button"
                                                                    onMouseDown={(
                                                                        e,
                                                                    ) => {
                                                                        e.preventDefault();
                                                                        handleSearchPick(
                                                                            result.symbol,
                                                                        );
                                                                        setIsSearchOpen(
                                                                            false,
                                                                        );
                                                                    }}
                                                                    className="px-4 py-2.5 flex w-full items-center justify-between hover:bg-secondary transition-colors border-b border-main last:border-0"
                                                                >
                                                                    <div className="flex items-center space-x-3 min-w-0">
                                                                        <TokenAvatar
                                                                            symbol={
                                                                                result.symbol
                                                                            }
                                                                            logoUrl={
                                                                                asset?.logoUrl ||
                                                                                resolveBoardStockLogoUrl(
                                                                                    result.symbol,
                                                                                )
                                                                            }
                                                                            size={
                                                                                28
                                                                            }
                                                                        />
                                                                        <div className="min-w-0 text-left">
                                                                            <div className="flex items-center space-x-1.5">
                                                                                <span className="text-[12px] font-semibold">
                                                                                    {
                                                                                        result.symbol
                                                                                    }
                                                                                </span>
                                                                                <span className="rounded border border-main px-1 py-0 text-[8px] uppercase tracking-wide text-muted">
                                                                                    {result
                                                                                        .groups[0] ||
                                                                                        "HOSE"}
                                                                                </span>
                                                                            </div>
                                                                            <div className="truncate text-[10px] text-muted max-w-[160px]">
                                                                                {
                                                                                    result.name
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right shrink-0">
                                                                        <div className="text-[12px] font-mono font-medium">
                                                                            {Number.isFinite(
                                                                                asset?.price,
                                                                            )
                                                                                ? asset!.price.toLocaleString(
                                                                                      "en-US",
                                                                                      {
                                                                                          maximumFractionDigits: 2,
                                                                                      },
                                                                                  )
                                                                                : "--"}
                                                                        </div>
                                                                        <div
                                                                            className={cn(
                                                                                "text-[9px] mt-0.5 flex items-center justify-end font-semibold",
                                                                                changePercent >=
                                                                                    0
                                                                                    ? "text-emerald-500"
                                                                                    : "text-rose-500",
                                                                            )}
                                                                        >
                                                                            {changePercent >=
                                                                            0 ? (
                                                                                <ArrowUpRight
                                                                                    size={
                                                                                        10
                                                                                    }
                                                                                    className="mr-0.5"
                                                                                />
                                                                            ) : (
                                                                                <ArrowDownRight
                                                                                    size={
                                                                                        10
                                                                                    }
                                                                                    className="mr-0.5"
                                                                                />
                                                                            )}
                                                                            {Math.abs(
                                                                                changePercent,
                                                                            ).toFixed(
                                                                                2,
                                                                            )}
                                                                            %
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        },
                                                    )
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex h-full items-center gap-1 overflow-x-auto thin-scrollbar">
                            {[
                                "Danh mục của tôi (Soon)",
                                "VN30",
                                "HNX30",
                                "HOSE",
                                "HNX",
                                "UPCOM",
                                "CP Ngành",
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
                                          const tickerTone = getPriceTone(
                                              stock.match.price,
                                              normalizeToneComparator(
                                                  stock.priceScale
                                                      .matchPriceFromDnse,
                                                  stock.ref,
                                                  stock.priceScale.tcFromDnse,
                                              ),
                                              normalizeToneComparator(
                                                  stock.priceScale
                                                      .matchPriceFromDnse,
                                                  stock.ceiling,
                                                  stock.priceScale
                                                      .ceilingFromDnse,
                                              ),
                                              normalizeToneComparator(
                                                  stock.priceScale
                                                      .matchPriceFromDnse,
                                                  stock.floor,
                                                  stock.priceScale
                                                      .floorFromDnse,
                                              ),
                                          );
                                          const tickerToneClass =
                                              Number.isFinite(stock.match.price)
                                                  ? toneToTextClass(tickerTone)
                                                  : "text-muted";
                                          return (
                                              <tr
                                                  key={stock.id}
                                                  ref={(el) => {
                                                      rowRefs.current[
                                                          stock.ticker
                                                      ] = el;
                                                  }}
                                                  className={cn(
                                                      getRowClassName(index),
                                                      highlightedSymbol ===
                                                          stock.ticker &&
                                                          "!bg-amber-500/25 ring-1 ring-inset ring-amber-400/80",
                                                  )}
                                              >
                                                  <td
                                                      className={cn(
                                                          "border-r border-main px-2 font-semibold",
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
                                                              <div
                                                                  className={cn(
                                                                      "truncate",
                                                                      tickerToneClass,
                                                                  )}
                                                              >
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
                                                          stock.priceScale
                                                              .ceilingFromDnse,
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
                                                          stock.priceScale
                                                              .floorFromDnse,
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
                                                          stock.priceScale
                                                              .tcFromDnse,
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
                                                                      refVal={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .buyFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.ref,
                                                                          stock
                                                                              .priceScale
                                                                              .tcFromDnse,
                                                                      )}
                                                                      ceiling={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .buyFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.ceiling,
                                                                          stock
                                                                              .priceScale
                                                                              .ceilingFromDnse,
                                                                      )}
                                                                      floor={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .buyFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.floor,
                                                                          stock
                                                                              .priceScale
                                                                              .floorFromDnse,
                                                                      )}
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
                                                                          stock
                                                                              .priceScale
                                                                              .buyFromDnse[
                                                                              i
                                                                          ],
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
                                                                      refVal={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .buyFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.ref,
                                                                          stock
                                                                              .priceScale
                                                                              .tcFromDnse,
                                                                      )}
                                                                      ceiling={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .buyFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.ceiling,
                                                                          stock
                                                                              .priceScale
                                                                              .ceilingFromDnse,
                                                                      )}
                                                                      floor={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .buyFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.floor,
                                                                          stock
                                                                              .priceScale
                                                                              .floorFromDnse,
                                                                      )}
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
                                                          refVal={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .matchPriceFromDnse,
                                                              stock.ref,
                                                              stock.priceScale
                                                                  .tcFromDnse,
                                                          )}
                                                          ceiling={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .matchPriceFromDnse,
                                                              stock.ceiling,
                                                              stock.priceScale
                                                                  .ceilingFromDnse,
                                                          )}
                                                          floor={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .matchPriceFromDnse,
                                                              stock.floor,
                                                              stock.priceScale
                                                                  .floorFromDnse,
                                                          )}
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
                                                              stock.priceScale
                                                                  .matchPriceFromDnse,
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
                                                          refVal={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .matchPriceFromDnse,
                                                              stock.ref,
                                                              stock.priceScale
                                                                  .tcFromDnse,
                                                          )}
                                                          ceiling={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .matchPriceFromDnse,
                                                              stock.ceiling,
                                                              stock.priceScale
                                                                  .ceilingFromDnse,
                                                          )}
                                                          floor={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .matchPriceFromDnse,
                                                              stock.floor,
                                                              stock.priceScale
                                                                  .floorFromDnse,
                                                          )}
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
                                                      {formatBoardSignedPriceDisplay(
                                                          stock.match.change,
                                                          stock.priceScale
                                                              .matchChangeFromDnse,
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
                                                                      refVal={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .sellFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.ref,
                                                                          stock
                                                                              .priceScale
                                                                              .tcFromDnse,
                                                                      )}
                                                                      ceiling={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .sellFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.ceiling,
                                                                          stock
                                                                              .priceScale
                                                                              .ceilingFromDnse,
                                                                      )}
                                                                      floor={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .sellFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.floor,
                                                                          stock
                                                                              .priceScale
                                                                              .floorFromDnse,
                                                                      )}
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
                                                                          stock
                                                                              .priceScale
                                                                              .sellFromDnse[
                                                                              i
                                                                          ],
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
                                                                      refVal={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .sellFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.ref,
                                                                          stock
                                                                              .priceScale
                                                                              .tcFromDnse,
                                                                      )}
                                                                      ceiling={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .sellFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.ceiling,
                                                                          stock
                                                                              .priceScale
                                                                              .ceilingFromDnse,
                                                                      )}
                                                                      floor={normalizeToneComparator(
                                                                          stock
                                                                              .priceScale
                                                                              .sellFromDnse[
                                                                              i
                                                                          ],
                                                                          stock.floor,
                                                                          stock
                                                                              .priceScale
                                                                              .floorFromDnse,
                                                                      )}
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
                                                          "border-r border-main p-2 text-right bg-slate-500/10",
                                                          flashClass(
                                                              `${rowKey}:high`,
                                                          ),
                                                      )}
                                                  >
                                                      <ColorText
                                                          value={stock.high}
                                                          refVal={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .highFromDnse,
                                                              stock.ref,
                                                              stock.priceScale
                                                                  .tcFromDnse,
                                                          )}
                                                          ceiling={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .highFromDnse,
                                                              stock.ceiling,
                                                              stock.priceScale
                                                                  .ceilingFromDnse,
                                                          )}
                                                          floor={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .highFromDnse,
                                                              stock.floor,
                                                              stock.priceScale
                                                                  .floorFromDnse,
                                                          )}
                                                          className={
                                                              isFlashing(
                                                                  `${rowKey}:high`,
                                                              )
                                                                  ? "!text-white"
                                                                  : undefined
                                                          }
                                                      >
                                                          {formatBoardPriceDisplay(
                                                              stock.high,
                                                              stock.priceScale
                                                                  .highFromDnse,
                                                          )}
                                                      </ColorText>
                                                  </td>
                                                  <td
                                                      className={cn(
                                                          "border-r border-main p-2 text-right bg-slate-500/10",
                                                          flashClass(
                                                              `${rowKey}:low`,
                                                          ),
                                                      )}
                                                  >
                                                      <ColorText
                                                          value={stock.low}
                                                          refVal={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .lowFromDnse,
                                                              stock.ref,
                                                              stock.priceScale
                                                                  .tcFromDnse,
                                                          )}
                                                          ceiling={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .lowFromDnse,
                                                              stock.ceiling,
                                                              stock.priceScale
                                                                  .ceilingFromDnse,
                                                          )}
                                                          floor={normalizeToneComparator(
                                                              stock.priceScale
                                                                  .lowFromDnse,
                                                              stock.floor,
                                                              stock.priceScale
                                                                  .floorFromDnse,
                                                          )}
                                                          className={
                                                              isFlashing(
                                                                  `${rowKey}:low`,
                                                              )
                                                                  ? "!text-white"
                                                                  : undefined
                                                          }
                                                      >
                                                          {formatBoardPriceDisplay(
                                                              stock.low,
                                                              stock.priceScale
                                                                  .lowFromDnse,
                                                          )}
                                                      </ColorText>
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
