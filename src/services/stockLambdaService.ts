import type { Asset, MarketType, OhlcvPoint } from "./binanceService";

const STOCK_LAMBDA_URL = process.env.NEXT_PUBLIC_STOCK_LAMBDA_URL;
const STOCK_LIST_LIMIT = Number.parseInt(
    process.env.NEXT_PUBLIC_STOCK_LIST_LIMIT || "1607",
    10,
);
const STOCK_HISTORY_CONCURRENCY = Number.parseInt(
    process.env.NEXT_PUBLIC_STOCK_HISTORY_CONCURRENCY || "16",
    10,
);
const STOCK_LISTING_CACHE_TTL_MS = Number.parseInt(
    process.env.NEXT_PUBLIC_STOCK_LISTING_CACHE_TTL_MS || `${10 * 60 * 1000}`,
    10,
);
const STOCK_BULK_SNAPSHOT_TTL_MS = Number.parseInt(
    process.env.NEXT_PUBLIC_STOCK_BULK_SNAPSHOT_TTL_MS ||
        `${30 * 1000}`,
    10,
);
const STOCK_BULK_SNAPSHOT_WORKERS = Number.parseInt(
    process.env.NEXT_PUBLIC_STOCK_BULK_SNAPSHOT_WORKERS || "24",
    10,
);
const STOCK_CHART_CACHE_TTL_MS = Number.parseInt(
    process.env.NEXT_PUBLIC_STOCK_CHART_CACHE_TTL_MS || `${60 * 1000}`,
    10,
);
const STOCK_CHART_CACHE_MAX_ENTRIES = Number.parseInt(
    process.env.NEXT_PUBLIC_STOCK_CHART_CACHE_MAX_ENTRIES || "120",
    10,
);
const STOCK_PRICE_BOARD_CHUNK_SIZE = Number.parseInt(
    process.env.NEXT_PUBLIC_STOCK_PRICE_BOARD_CHUNK_SIZE || "80",
    10,
);
const STOCK_PRICE_BOARD_CHUNK_CONCURRENCY = Number.parseInt(
    process.env.NEXT_PUBLIC_STOCK_PRICE_BOARD_CHUNK_CONCURRENCY || "4",
    10,
);

type LambdaEnvelope<T = unknown> = {
    success?: boolean;
    data?: T;
    error?: string;
};

type ListingRow = {
    ticker?: string;
    exchange?: string;
    logo_url?: string;
    logoUrl?: string;
    organName?: string;
    organShortName?: string;
    organTypeCode?: string;
    comTypeCode?: string;
    icbName?: string;
    icbNamePath?: string;
    sector?: string;
    industry?: string;
    group?: string;
    subgroup?: string;
    icbCode?: number;
    comGroupCode?: string;
    VN30?: boolean;
    VNMID?: boolean;
    VN100?: boolean;
    VNSML?: boolean;
    VNALL?: boolean;
    HNX30?: boolean;
    VNX50?: boolean;
    VNXALL?: boolean;
    VNDIAMOND?: boolean;
    VNFINLEAD?: boolean;
    VNFINSELECT?: boolean;
    VNSI?: boolean;
    VNCOND?: boolean;
    VNCONS?: boolean;
    VNENE?: boolean;
    VNFIN?: boolean;
    VNHEAL?: boolean;
    VNIND?: boolean;
    VNIT?: boolean;
    VNMAT?: boolean;
    VNREAL?: boolean;
    VNUTI?: boolean;
};

type HistoryRow = {
    time?: string;
    timestamp?: number;
    date?: string;
    tradingDate?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
    ticker?: string;
};

type SnapshotRow = {
    ticker?: string;
    symbol?: string;
    open?: NumberLike;
    high?: NumberLike;
    low?: NumberLike;
    close?: NumberLike;
    lastPrice?: NumberLike;
    matchedPrice?: NumberLike;
    matchPrice?: NumberLike;
    volume?: NumberLike;
    totalVolume?: NumberLike;
    totalMatchVolume?: NumberLike;
    prev_close?: NumberLike;
    prevClose?: NumberLike;
    change?: NumberLike;
    change_percent?: NumberLike;
    changePercent?: NumberLike;
    changePc?: NumberLike;
};

type NumberLike = number | string | null | undefined;
let listingCache: ListingRow[] | null = null;
let listingCacheAt = 0;
let bulkSnapshotCache: SnapshotRow[] | null = null;
let bulkSnapshotCacheAt = 0;
let bulkSnapshotInflight: Promise<SnapshotRow[]> | null = null;
const chartCache = new Map<
    string,
    {
        expiresAt: number;
        value: OhlcvPoint[];
    }
>();
const LISTING_INDEX_KEYS = [
    "VN30",
    "VNMID",
    "VN100",
    "VNSML",
    "VNALL",
    "HNX30",
    "VNX50",
    "VNXALL",
    "VNDIAMOND",
    "VNFINLEAD",
    "VNFINSELECT",
    "VNSI",
    "VNCOND",
    "VNCONS",
    "VNENE",
    "VNFIN",
    "VNHEAL",
    "VNIND",
    "VNIT",
    "VNMAT",
    "VNREAL",
    "VNUTI",
] as const;

function parseNum(v: NumberLike): number {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (typeof v !== "string") return 0;
    const cleaned = v.replace(/,/g, "").trim();
    if (!cleaned) return 0;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStockTicker(raw: string): string | null {
    const ticker = String(raw || "")
        .trim()
        .toUpperCase()
        .replace(/-(C|F)$/i, "");
    if (!ticker) return null;
    if (!/^[A-Z0-9]{1,12}$/.test(ticker)) return null;
    if (ticker.endsWith("USDT")) return null;
    return ticker;
}

function compactUsd(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return "-";
    if (value >= 1_000_000_000_000)
        return `${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (value >= 1_000_000_000)
        return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    return value.toFixed(0);
}

function dateToMs(value?: string): number {
    if (!value) return Date.now();
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : Date.now();
}

function toRecordList(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (item): item is Record<string, unknown> =>
            Boolean(item && typeof item === "object"),
    );
}

function pickString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim()
        ? value.trim()
        : undefined;
}

function pickBoolean(value: unknown): boolean | undefined {
    return typeof value === "boolean" ? value : undefined;
}

function pickNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : undefined;
}

function indexMembershipFromRow(
    row: Record<string, unknown>,
): string[] | undefined {
    const indexes = LISTING_INDEX_KEYS.filter((key) => row[key] === true);
    return indexes.length ? indexes : undefined;
}

function requireLambdaUrl(): string {
    if (!STOCK_LAMBDA_URL) {
        throw new Error("Missing NEXT_PUBLIC_STOCK_LAMBDA_URL env");
    }
    return STOCK_LAMBDA_URL;
}

function resolveStockLogoUrl(ticker: string, listing?: ListingRow): string {
    const configuredBase = STOCK_LAMBDA_URL?.trim() || "";
    const fallbackPath = configuredBase.startsWith("/")
        ? `${configuredBase.replace(/\/+$/, "")}/image/${encodeURIComponent(ticker)}`
        : `/stock/image/${encodeURIComponent(ticker)}`;
    const rawPath =
        (listing?.logo_url || listing?.logoUrl || "").trim() || fallbackPath;
    const logoPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

    if (/^https?:\/\//i.test(logoPath)) {
        return logoPath;
    }

    if (!configuredBase) {
        return logoPath;
    }

    if (configuredBase.startsWith("/")) {
        const normalizedBase = configuredBase.replace(/\/+$/, "");
        if (logoPath.startsWith(`${normalizedBase}/`)) {
            return logoPath;
        }
        if (logoPath.startsWith("/stock/")) {
            return `${normalizedBase}${logoPath.slice("/stock".length)}`;
        }
        return `${normalizedBase}${logoPath}`;
    }

    try {
        return new URL(logoPath, configuredBase).toString();
    } catch {
        return logoPath;
    }
}

async function getLambda<T>(
    params: Record<string, string>,
    opts?: {
        cache?: RequestCache;
    },
): Promise<LambdaEnvelope<T>> {
    const baseUrl = requireLambdaUrl();
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${baseUrl}?${query}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
        },
        cache: opts?.cache ?? "no-store",
    });

    if (!response.ok) {
        throw new Error(`Stock lambda error: ${response.status}`);
    }

    return (await response.json()) as LambdaEnvelope<T>;
}

function normalizeSafeLimit(limit: number): number {
    if (!Number.isFinite(limit)) return 1607;
    return Math.min(Math.max(Math.floor(limit), 10), 5000);
}

function getChartCacheKey(
    symbol: string,
    resolution: string,
    days: number,
    opts?: {
        startDate?: string;
        endDate?: string;
    },
): string {
    return [
        symbol.toUpperCase(),
        resolution,
        String(days),
        opts?.startDate ?? "",
        opts?.endDate ?? "",
    ].join("|");
}

function setChartCacheEntry(key: string, value: OhlcvPoint[]): void {
    chartCache.set(key, {
        value,
        expiresAt: Date.now() + Math.max(5_000, STOCK_CHART_CACHE_TTL_MS || 0),
    });

    if (chartCache.size <= Math.max(20, STOCK_CHART_CACHE_MAX_ENTRIES || 0)) {
        return;
    }

    const oldestKey = chartCache.keys().next().value;
    if (oldestKey) {
        chartCache.delete(oldestKey);
    }
}

async function getBulkSnapshotRows(limit: number): Promise<SnapshotRow[]> {
    const safeLimit = normalizeSafeLimit(limit);
    const ttl = Math.max(5_000, STOCK_BULK_SNAPSHOT_TTL_MS || 0);
    const now = Date.now();

    if (
        bulkSnapshotCache &&
        now - bulkSnapshotCacheAt < ttl &&
        bulkSnapshotCache.length > 0
    ) {
        return bulkSnapshotCache.slice(0, safeLimit);
    }

    if (bulkSnapshotInflight) {
        const rows = await bulkSnapshotInflight;
        return rows.slice(0, safeLimit);
    }

    bulkSnapshotInflight = getLambda<SnapshotRow[]>(
        {
            cmd: "bulk_snapshot",
            limit: String(safeLimit),
            workers: String(
                Math.min(
                    64,
                    Math.max(2, STOCK_BULK_SNAPSHOT_WORKERS || 24),
                ),
            ),
        },
        { cache: "no-store" },
    )
        .then((payload) => {
            const rows = toRecordList(payload.data) as unknown as SnapshotRow[];
            bulkSnapshotCache = rows;
            bulkSnapshotCacheAt = Date.now();
            return rows;
        })
        .finally(() => {
            bulkSnapshotInflight = null;
        });

    const rows = await bulkSnapshotInflight;
    return rows.slice(0, safeLimit);
}

function mapChartRows(rows: Record<string, unknown>[]): OhlcvPoint[] {
    const normalized = rows
        .map((row) => {
            const tsRaw = row.timestamp;
            const timeRaw = row.time ?? row.date ?? row.tradingDate;
            const normalizedTimestamp =
                typeof tsRaw === "number"
                    ? tsRaw < 1_000_000_000_000
                        ? tsRaw * 1000
                        : tsRaw
                    : typeof tsRaw === "string"
                      ? (() => {
                            const parsed = Number.parseInt(tsRaw, 10);
                            if (!Number.isFinite(parsed)) return NaN;
                            return parsed < 1_000_000_000_000
                                ? parsed * 1000
                                : parsed;
                        })()
                      : NaN;
            const timestamp =
                Number.isFinite(normalizedTimestamp)
                    ? normalizedTimestamp
                    : dateToMs(
                          typeof timeRaw === "string" ? timeRaw : undefined,
                      );
            return {
                timestamp,
                time: "",
                open: parseNum(row.open as NumberLike),
                high: parseNum(row.high as NumberLike),
                low: parseNum(row.low as NumberLike),
                close: parseNum(row.close as NumberLike),
                volume: parseNum(row.volume as NumberLike),
            };
        })
        .filter((row) => row.close > 0)
        .sort((a, b) => a.timestamp - b.timestamp);

    const dedup = new Map<number, OhlcvPoint>();
    normalized.forEach((row) => {
        dedup.set(row.timestamp, row);
    });
    return Array.from(dedup.values()).sort((a, b) => a.timestamp - b.timestamp);
}

function toBaseAsset(
    ticker: string,
    listingMap: Map<string, ListingRow>,
    marketType: MarketType,
): Asset {
    const listing = listingMap.get(ticker);
    return {
        id: ticker,
        symbol: ticker,
        name: listing?.organName || ticker,
        logoUrl: resolveStockLogoUrl(ticker, listing),
        price: 0,
        change: 0,
        changePercent: 0,
        marketCap: "-",
        volume24h: "-",
        high24h: 0,
        low24h: 0,
        baseVolume: 0,
        quoteVolumeRaw: 0,
        sparkline: [],
        marketType,
        stockProfile: listing
            ? {
                  exchange: listing.comGroupCode || listing.exchange,
                  organName: listing.organName,
                  organShortName: listing.organShortName,
                  organTypeCode: listing.organTypeCode,
                  comTypeCode: listing.comTypeCode,
                  sector: listing.sector,
                  industry: listing.industry,
                  group: listing.group,
                  subgroup: listing.subgroup,
                  icbName: listing.icbName,
                  icbNamePath: listing.icbNamePath,
                  icbCode: listing.icbCode,
                  indexMembership: indexMembershipFromRow(
                      listing as unknown as Record<string, unknown>,
                  ),
              }
            : undefined,
    };
}

function toAssetFromSnapshot(
    row: SnapshotRow,
    listingMap: Map<string, ListingRow>,
    marketType: MarketType,
): Asset | null {
    const ticker = String(row.ticker || row.symbol || "").trim().toUpperCase();
    if (!ticker) return null;

    const close = parseNum(
        row.close ?? row.lastPrice ?? row.matchedPrice ?? row.matchPrice,
    );
    if (close <= 0) return null;

    const prevClose = parseNum(row.prev_close ?? row.prevClose);
    const changeDirect = parseNum(row.change);
    const change =
        Number.isFinite(changeDirect) && changeDirect !== 0
            ? changeDirect
            : prevClose > 0
              ? close - prevClose
              : 0;
    const changePercentDirect = parseNum(
        row.change_percent ?? row.changePercent ?? row.changePc,
    );
    const changePercent =
        Number.isFinite(changePercentDirect) && changePercentDirect !== 0
            ? changePercentDirect
            : prevClose > 0
              ? (change / prevClose) * 100
              : 0;
    const volume = parseNum(
        row.volume ?? row.totalVolume ?? row.totalMatchVolume,
    );

    const listing = listingMap.get(ticker);
    return {
        id: ticker,
        symbol: ticker,
        name: listing?.organName || ticker,
        logoUrl: resolveStockLogoUrl(ticker, listing),
        price: close,
        change,
        changePercent,
        marketCap: "-",
        volume24h: compactUsd(volume * close),
        high24h: parseNum(row.high) || close,
        low24h: parseNum(row.low) || close,
        baseVolume: volume,
        quoteVolumeRaw: volume * close,
        sparkline: [],
        marketType,
        stockProfile: listing
            ? {
                  exchange: listing.comGroupCode || listing.exchange,
                  organName: listing.organName,
                  organShortName: listing.organShortName,
                  organTypeCode: listing.organTypeCode,
                  comTypeCode: listing.comTypeCode,
                  sector: listing.sector,
                  industry: listing.industry,
                  group: listing.group,
                  subgroup: listing.subgroup,
                  icbName: listing.icbName,
                  icbNamePath: listing.icbNamePath,
                  icbCode: listing.icbCode,
                  indexMembership: indexMembershipFromRow(
                      listing as unknown as Record<string, unknown>,
                  ),
              }
            : undefined,
    };
}

function toAssetFromHistoryRows(
    ticker: string,
    rows: HistoryRow[],
    listingMap: Map<string, ListingRow>,
    marketType: MarketType,
): Asset | null {
    const sorted = [...rows].sort(
        (a, b) =>
            dateToMs(a.time ?? a.date ?? a.tradingDate) -
            dateToMs(b.time ?? b.date ?? b.tradingDate),
    );
    const latest = sorted.at(-1);
    if (!latest) return null;
    const previous = sorted.length >= 2 ? sorted.at(-2) : latest;

    const close = parseNum(latest.close);
    if (close <= 0) return null;
    const prevClose = parseNum(previous?.close) || close;
    const change = close - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const volume = parseNum(latest.volume);

    const listing = listingMap.get(ticker);
    return {
        id: ticker,
        symbol: ticker,
        name: listing?.organName || ticker,
        logoUrl: resolveStockLogoUrl(ticker, listing),
        price: close,
        change,
        changePercent,
        marketCap: "-",
        volume24h: compactUsd(volume * close),
        high24h: parseNum(latest.high) || close,
        low24h: parseNum(latest.low) || close,
        baseVolume: volume,
        quoteVolumeRaw: volume * close,
        sparkline: sorted
            .slice(-20)
            .map((r) => parseNum(r.close))
            .filter((v) => v > 0),
        marketType,
        stockProfile: listing
            ? {
                  exchange: listing.comGroupCode || listing.exchange,
                  organName: listing.organName,
                  organShortName: listing.organShortName,
                  organTypeCode: listing.organTypeCode,
                  comTypeCode: listing.comTypeCode,
                  sector: listing.sector,
                  industry: listing.industry,
                  group: listing.group,
                  subgroup: listing.subgroup,
                  icbName: listing.icbName,
                  icbNamePath: listing.icbNamePath,
                  icbCode: listing.icbCode,
                  indexMembership: indexMembershipFromRow(
                      listing as unknown as Record<string, unknown>,
                  ),
              }
            : undefined,
    };
}

async function getHistoryDaily(symbol: string): Promise<HistoryRow[]> {
    const payload = await getLambda<HistoryRow[]>({
        cmd: "stock_historical_data",
        symbol,
        days: "8",
        resolution: "1D",
    });
    return toRecordList(payload.data) as unknown as HistoryRow[];
}

export const stockLambdaService = {
    isConfigured(): boolean {
        return Boolean(STOCK_LAMBDA_URL);
    },

    async getListingCompanies(): Promise<ListingRow[]> {
        const now = Date.now();
        if (
            listingCache &&
            now - listingCacheAt <
                Math.max(5_000, STOCK_LISTING_CACHE_TTL_MS || 0)
        ) {
            return listingCache;
        }

        const payload = await getLambda<ListingRow[]>({ cmd: "listing_companies" });
        const rows = toRecordList(payload.data);
        const normalized = rows
            .map((row) => {
                const typed = row as Record<string, unknown>;
                return {
                    ticker: pickString(typed.ticker)?.toUpperCase(),
                    exchange: pickString(typed.exchange),
                    logo_url:
                        pickString(typed.logo_url) ?? pickString(typed.logoUrl),
                    organName: pickString(typed.organName),
                    organShortName: pickString(typed.organShortName),
                    organTypeCode: pickString(typed.organTypeCode),
                    comTypeCode: pickString(typed.comTypeCode),
                    icbName: pickString(typed.icbName),
                    icbNamePath: pickString(typed.icbNamePath),
                    sector: pickString(typed.sector),
                    industry: pickString(typed.industry),
                    group: pickString(typed.group),
                    subgroup: pickString(typed.subgroup),
                    icbCode: pickNumber(typed.icbCode),
                    comGroupCode: pickString(typed.comGroupCode),
                    VN30: pickBoolean(typed.VN30),
                    VNMID: pickBoolean(typed.VNMID),
                    VN100: pickBoolean(typed.VN100),
                    VNSML: pickBoolean(typed.VNSML),
                    VNALL: pickBoolean(typed.VNALL),
                    HNX30: pickBoolean(typed.HNX30),
                    VNX50: pickBoolean(typed.VNX50),
                    VNXALL: pickBoolean(typed.VNXALL),
                    VNDIAMOND: pickBoolean(typed.VNDIAMOND),
                    VNFINLEAD: pickBoolean(typed.VNFINLEAD),
                    VNFINSELECT: pickBoolean(typed.VNFINSELECT),
                    VNSI: pickBoolean(typed.VNSI),
                    VNCOND: pickBoolean(typed.VNCOND),
                    VNCONS: pickBoolean(typed.VNCONS),
                    VNENE: pickBoolean(typed.VNENE),
                    VNFIN: pickBoolean(typed.VNFIN),
                    VNHEAL: pickBoolean(typed.VNHEAL),
                    VNIND: pickBoolean(typed.VNIND),
                    VNIT: pickBoolean(typed.VNIT),
                    VNMAT: pickBoolean(typed.VNMAT),
                    VNREAL: pickBoolean(typed.VNREAL),
                    VNUTI: pickBoolean(typed.VNUTI),
                } satisfies ListingRow;
            })
            .filter((row) => Boolean(row.ticker));
        listingCache = normalized;
        listingCacheAt = now;
        return normalized;
    },

    async getStockAssets(marketType: MarketType): Promise<Asset[]> {
        const listings = await this.getListingCompanies();
        const safeLimit = Number.isFinite(STOCK_LIST_LIMIT)
            ? Math.min(Math.max(STOCK_LIST_LIMIT, 10), 5000)
            : 1607;

        const shortlist = listings
            .map((row) => row.ticker)
            .filter((ticker): ticker is string => Boolean(ticker))
            .slice(0, safeLimit);

        const listingMap = new Map<string, ListingRow>();
        listings.forEach((row) => {
            if (row.ticker) {
                listingMap.set(row.ticker, row);
            }
        });

        return shortlist.map((ticker) =>
            toBaseAsset(ticker, listingMap, marketType),
        );
    },

    async getBulkSnapshots(
        symbols: string[],
        marketType: MarketType,
        listingByTicker?: Map<string, ListingRow>,
    ): Promise<Map<string, Asset>> {
        const listingMap = new Map<string, ListingRow>(listingByTicker);
        if (listingMap.size === 0) {
            const listings = await this.getListingCompanies();
            listings.forEach((row) => {
                if (row.ticker) listingMap.set(row.ticker, row);
            });
        }
        const dedupSymbols = Array.from(
            new Set(
                symbols
                    .map((s) => normalizeStockTicker(s))
                    .filter((s): s is string => Boolean(s)),
            ),
        );
        if (!dedupSymbols.length) return new Map();
        const out = new Map<string, Asset>();

        // Fast path: get batch prices for requested symbols in one call.
        try {
            const payload = await getLambda<SnapshotRow[]>({
                cmd: "price_board",
                symbols: dedupSymbols.join(","),
            });
            const rows = toRecordList(payload.data) as unknown as SnapshotRow[];
            rows.forEach((row) => {
                const asset = toAssetFromSnapshot(row, listingMap, marketType);
                if (asset) out.set(asset.id, asset);
            });
            return out;
        } catch {
            return out;
        }
    },

    async getStockChart(
        symbol: string,
        resolution: string,
        days: number,
        opts?: {
            startDate?: string;
            endDate?: string;
        },
    ): Promise<OhlcvPoint[]> {
        const safeTicker = normalizeStockTicker(symbol);
        if (!safeTicker) {
            throw new Error(`Invalid stock ticker: ${symbol}`);
        }
        const params: Record<string, string> = {
            cmd: "stock_historical_data",
            symbol: safeTicker,
            resolution,
            days: String(days),
        };
        if (opts?.startDate) params.start_date = opts.startDate;
        if (opts?.endDate) params.end_date = opts.endDate;

        const payload = await getLambda<Record<string, unknown>[]>(params);
        return mapChartRows(toRecordList(payload.data));
    },
};
