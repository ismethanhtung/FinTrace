"use client";

import Image from "next/image";
import Link from "next/link";
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

const INDEX_NAMES = ["VNINDEX", "VN30", "HNX30", "VNXALL", "HNXINDEX", "UPCOM"];
const INITIAL_COL_WIDTHS = [
    90, 64, 64, 64, 64, 84, 64, 84, 64, 84, 64, 84, 64, 72, 64, 84, 64, 84, 64,
    84, 112, 64, 64, 110, 110, 130,
];

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
    let color = "text-amber-500";
    if (value === ceiling) color = "text-fuchsia-500";
    else if (value === floor) color = "text-cyan-500";
    else if (value > refVal) color = "text-emerald-500";
    else if (value < refVal) color = "text-rose-500";

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
    const { assets } = useMarket();
    const [activeTab, setActiveTab] = useState("VN30");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [colWidths, setColWidths] = useState<number[]>(INITIAL_COL_WIDTHS);
    const resizeStateRef = useRef<{
        index: number;
        startX: number;
        startWidth: number;
    } | null>(null);

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

    const boardRows = useMemo<BoardStockRow[]>(
        () =>
            filteredAssets.map((asset) => {
                const price = Number.isFinite(asset.price) ? asset.price : 0;
                const change = Number.isFinite(asset.change) ? asset.change : 0;
                const ref = Math.max(0, price - change);
                const mkQty = Number.isFinite(asset.baseVolume)
                    ? asset.baseVolume
                    : 0;
                const levelVol = "0";
                return {
                    id: asset.id,
                    ticker: asset.symbol,
                    name: asset.name || asset.symbol,
                    logoUrl: asset.logoUrl,
                    exchange: asset.stockProfile?.exchange,
                    indexMembership: asset.stockProfile?.indexMembership ?? [],
                    ceiling: 0,
                    floor: 0,
                    ref,
                    buy: [
                        { price: 0, vol: levelVol },
                        { price: 0, vol: levelVol },
                        { price: 0, vol: levelVol },
                    ],
                    match: {
                        price,
                        vol: Math.round(mkQty).toLocaleString("en-US"),
                        change,
                        percent: Number.isFinite(asset.changePercent)
                            ? asset.changePercent
                            : 0,
                    },
                    sell: [
                        { price: 0, vol: levelVol },
                        { price: 0, vol: levelVol },
                        { price: 0, vol: levelVol },
                    ],
                    totalVol: Math.round(mkQty).toLocaleString("en-US"),
                    high: Number.isFinite(asset.high24h) ? asset.high24h : 0,
                    low: Number.isFinite(asset.low24h) ? asset.low24h : 0,
                    foreign: { buy: "0", sell: "0", room: "0" },
                };
            }),
        [filteredAssets],
    );
    const rowsToRender = boardRows.length
        ? boardRows
        : [
              {
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
              } satisfies BoardStockRow,
          ];

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
                                        className="relative min-w-[90px] border-r border-b border-main p-2"
                                    >
                                        CK
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(0, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="relative border-r border-b border-main p-2 text-fuchsia-500"
                                    >
                                        Trần
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(1, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="relative border-r border-b border-main p-2 text-cyan-500"
                                    >
                                        Sàn
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(2, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="relative border-r border-b border-main p-2 text-amber-500"
                                    >
                                        TC
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(3, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        colSpan={6}
                                        className="border-r border-main border-b border-main p-1 text-center"
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
                                        className="relative border-r border-b border-main p-2"
                                    >
                                        Tổng KL
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(20, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="relative border-r border-b border-main p-2"
                                    >
                                        Cao
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(21, e)
                                            }
                                        />
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="relative border-r border-b border-main p-2"
                                    >
                                        Thấp
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
                                    <th className="relative border-r border-main p-1">
                                        Giá 3
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(4, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        KL 3
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(5, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        Giá 2
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(6, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        KL 2
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(7, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        Giá 1
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(8, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        KL 1
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(9, e)
                                            }
                                        />
                                    </th>

                                    <th className="relative border-r border-main p-1">
                                        Giá
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(10, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        KL
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(11, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        +/-
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(12, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        +/- (%)
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(13, e)
                                            }
                                        />
                                    </th>

                                    <th className="relative border-r border-main p-1">
                                        Giá 1
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(14, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        KL 1
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(15, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        Giá 2
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(16, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        KL 2
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(17, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        Giá 3
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(18, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        KL 3
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(19, e)
                                            }
                                        />
                                    </th>

                                    <th className="relative border-r border-main p-1">
                                        NN mua
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(23, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative border-r border-main p-1">
                                        NN bán
                                        <div
                                            className={resizeHandleClass}
                                            onMouseDown={(e) =>
                                                handleResizeStart(24, e)
                                            }
                                        />
                                    </th>
                                    <th className="relative p-1">
                                        Room
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
                                    : rowsToRender.map((stock, index) => (
                                          <tr
                                              key={stock.id}
                                              className={getRowClassName(index)}
                                          >
                                              <td className="border-r border-main p-2 font-semibold">
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                      <TokenAvatar
                                                          symbol={stock.ticker}
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
                                              <td className="border-r border-main p-2 text-right text-fuchsia-500">
                                                  {stock.ceiling.toFixed(2)}
                                              </td>
                                              <td className="border-r border-main p-2 text-right text-cyan-500">
                                                  {stock.floor.toFixed(2)}
                                              </td>
                                              <td className="border-r border-main p-2 text-right text-amber-500">
                                                  {stock.ref.toFixed(2)}
                                              </td>

                                              {stock.buy.map((b, i) => (
                                                  <React.Fragment
                                                      key={`${stock.ticker}-buy-${i}`}
                                                  >
                                                      <td className="border-r border-main p-1 text-right">
                                                          <ColorText
                                                              value={b.price}
                                                              refVal={stock.ref}
                                                              ceiling={
                                                                  stock.ceiling
                                                              }
                                                              floor={
                                                                  stock.floor
                                                              }
                                                          >
                                                              {b.price.toFixed(
                                                                  2,
                                                              )}
                                                          </ColorText>
                                                      </td>
                                                      <td className="border-r border-main p-1 text-right font-semibold text-emerald-500">
                                                          {b.vol}
                                                      </td>
                                                  </React.Fragment>
                                              ))}

                                              <td className="border-r border-main p-1 text-right">
                                                  <ColorText
                                                      value={stock.match.price}
                                                      refVal={stock.ref}
                                                      ceiling={stock.ceiling}
                                                      floor={stock.floor}
                                                      className="font-semibold"
                                                  >
                                                      {stock.match.price.toFixed(
                                                          2,
                                                      )}
                                                  </ColorText>
                                              </td>
                                              <td className="border-r border-main p-1 text-right font-semibold text-emerald-500">
                                                  {stock.match.vol}
                                              </td>
                                              <td
                                                  className={cn(
                                                      "border-r border-main p-1 text-right",
                                                      stock.match.change >= 0
                                                          ? "text-emerald-500"
                                                          : "text-rose-500",
                                                  )}
                                              >
                                                  {stock.match.change.toFixed(
                                                      2,
                                                  )}
                                              </td>
                                              <td
                                                  className={cn(
                                                      "border-r border-main p-1 text-right",
                                                      stock.match.percent >= 0
                                                          ? "text-emerald-500"
                                                          : "text-rose-500",
                                                  )}
                                              >
                                                  {stock.match.percent.toFixed(
                                                      2,
                                                  )}
                                                  %
                                              </td>

                                              {stock.sell.map((s, i) => (
                                                  <React.Fragment
                                                      key={`${stock.ticker}-sell-${i}`}
                                                  >
                                                      <td className="border-r border-main p-1 text-right">
                                                          <ColorText
                                                              value={s.price}
                                                              refVal={stock.ref}
                                                              ceiling={
                                                                  stock.ceiling
                                                              }
                                                              floor={
                                                                  stock.floor
                                                              }
                                                          >
                                                              {s.price.toFixed(
                                                                  2,
                                                              )}
                                                          </ColorText>
                                                      </td>
                                                      <td className="border-r border-main p-1 text-right font-semibold text-rose-500">
                                                          {s.vol}
                                                      </td>
                                                  </React.Fragment>
                                              ))}

                                              <td className="border-r border-main p-2 text-right">
                                                  {stock.totalVol}
                                              </td>
                                              <td className="border-r border-main p-2 text-right text-emerald-500">
                                                  {stock.high.toFixed(2)}
                                              </td>
                                              <td className="border-r border-main p-2 text-right text-amber-500">
                                                  {stock.low.toFixed(2)}
                                              </td>

                                              <td className="border-r border-main p-1 text-right">
                                                  {stock.foreign.buy}
                                              </td>
                                              <td className="border-r border-main p-1 text-right">
                                                  {stock.foreign.sell}
                                              </td>
                                              <td className="p-1 text-right">
                                                  {stock.foreign.room || "--"}
                                              </td>
                                          </tr>
                                      ))}
                            </tbody>
                        </table>
                    </div>

                    <TickerBar />
                </>
            )}
        </div>
    );
}
