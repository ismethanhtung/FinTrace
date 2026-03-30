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

function compactUsd(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return "-";
    if (value >= 1_000_000_000_000)
        return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (value >= 1_000_000_000)
        return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
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
    const logoPath =
        (listing?.logo_url || listing?.logoUrl || "").trim() ||
        `/stock/image/${encodeURIComponent(ticker)}`;

    if (/^https?:\/\//i.test(logoPath)) {
        return logoPath;
    }

    const baseUrl = STOCK_LAMBDA_URL?.trim();
    if (!baseUrl) {
        return logoPath;
    }

    try {
        return new URL(logoPath, baseUrl).toString();
    } catch {
        return logoPath;
    }
}

async function getLambda<T>(
    params: Record<string, string>,
): Promise<LambdaEnvelope<T>> {
    const baseUrl = requireLambdaUrl();
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${baseUrl}?${query}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
        },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Stock lambda error: ${response.status}`);
    }

    return (await response.json()) as LambdaEnvelope<T>;
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
        isMock: false,
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
        isMock: false,
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
        isMock: false,
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
            new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)),
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
            if (out.size >= dedupSymbols.length) return out;
        } catch {
            // fallback below
        }

        // Fallback path: parallel history per symbol.
        const safeConcurrency = Number.isFinite(STOCK_HISTORY_CONCURRENCY)
            ? Math.min(Math.max(STOCK_HISTORY_CONCURRENCY, 2), 40)
            : 16;
        const missingSymbols = dedupSymbols.filter((symbol) => !out.has(symbol));

        for (let i = 0; i < missingSymbols.length; i += safeConcurrency) {
            const batch = missingSymbols.slice(i, i + safeConcurrency);
            const rows = await Promise.allSettled(
                batch.map(async (symbol) => {
                    const historyRows = await getHistoryDaily(symbol);
                    return { symbol, historyRows };
                }),
            );

            rows.forEach((result) => {
                if (result.status !== "fulfilled") return;
                const asset = toAssetFromHistoryRows(
                    result.value.symbol,
                    result.value.historyRows,
                    listingMap,
                    marketType,
                );
                if (asset) out.set(asset.id, asset);
            });
        }

        return out;
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
        const params: Record<string, string> = {
            cmd: "stock_historical_data",
            symbol,
            resolution,
            days: String(days),
        };
        if (opts?.startDate) params.start_date = opts.startDate;
        if (opts?.endDate) params.end_date = opts.endDate;

        const payload = await getLambda<Record<string, unknown>[]>(params);
        return mapChartRows(toRecordList(payload.data));
    },
};
