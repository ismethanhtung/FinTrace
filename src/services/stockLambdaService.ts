import type { Asset, MarketType, OhlcvPoint } from "./binanceService";

const STOCK_LAMBDA_URL = process.env.NEXT_PUBLIC_STOCK_LAMBDA_URL;
const STOCK_LIST_LIMIT = Number.parseInt(
    process.env.NEXT_PUBLIC_STOCK_LIST_LIMIT || "80",
    10,
);
const STOCK_HISTORY_CONCURRENCY = Number.parseInt(
    process.env.NEXT_PUBLIC_STOCK_HISTORY_CONCURRENCY || "8",
    10,
);

type LambdaEnvelope<T = unknown> = {
    success?: boolean;
    data?: T;
    error?: string;
};

type ListingRow = {
    ticker?: string;
    organName?: string;
    exchange?: string;
    comGroupCode?: string;
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
};

type NumberLike = number | string | null | undefined;

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
    if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
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
    return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
}

function requireLambdaUrl(): string {
    if (!STOCK_LAMBDA_URL) {
        throw new Error("Missing NEXT_PUBLIC_STOCK_LAMBDA_URL env");
    }
    return STOCK_LAMBDA_URL;
}

async function getLambda<T>(params: Record<string, string>): Promise<LambdaEnvelope<T>> {
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

function toStockAsset(
    ticker: string,
    historyRows: HistoryRow[],
    marketType: MarketType,
    nameMap: Map<string, string>,
): Asset {
    const sorted = [...historyRows].sort(
        (a, b) => dateToMs(a.time ?? a.date ?? a.tradingDate) - dateToMs(b.time ?? b.date ?? b.tradingDate),
    );
    const latest = sorted.at(-1);
    const previous = sorted.length >= 2 ? sorted.at(-2) : undefined;

    const lastClose = parseNum(latest?.close);
    const prevClose = parseNum(previous?.close) || lastClose;
    const change = lastClose - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    const high24h = Math.max(...sorted.slice(-5).map((row) => parseNum(row.high)), lastClose);
    const low24h = Math.min(...sorted.slice(-5).map((row) => parseNum(row.low)).filter((v) => v > 0), lastClose || 0);
    const latestVolume = parseNum(latest?.volume);
    const quoteVolumeRaw = latestVolume * Math.max(lastClose, 0);

    return {
        id: ticker,
        symbol: ticker,
        name: nameMap.get(ticker) || ticker,
        price: lastClose,
        change,
        changePercent,
        marketCap: "-",
        volume24h: compactUsd(quoteVolumeRaw),
        high24h,
        low24h,
        baseVolume: latestVolume,
        quoteVolumeRaw,
        sparkline: sorted.slice(-20).map((row) => parseNum(row.close)).filter((v) => v > 0),
        marketType,
        isMock: false,
    };
}

function mapChartRows(rows: Record<string, unknown>[]): OhlcvPoint[] {
    return rows
        .map((row) => {
            const tsRaw = row.timestamp;
            const timeRaw = row.time ?? row.date ?? row.tradingDate;
            const timestamp =
                typeof tsRaw === "number"
                    ? tsRaw
                    : dateToMs(typeof timeRaw === "string" ? timeRaw : undefined);
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
}

export const stockLambdaService = {
    isConfigured(): boolean {
        return Boolean(STOCK_LAMBDA_URL);
    },

    async getListingCompanies(): Promise<ListingRow[]> {
        const payload = await getLambda<ListingRow[]>({ cmd: "listing_companies" });
        const rows = toRecordList(payload.data);
        return rows
            .map((row) => ({
                ticker: typeof row.ticker === "string" ? row.ticker.toUpperCase() : undefined,
                organName: typeof row.organName === "string" ? row.organName : undefined,
                exchange: typeof row.exchange === "string" ? row.exchange : undefined,
                comGroupCode:
                    typeof row.comGroupCode === "string" ? row.comGroupCode : undefined,
            }))
            .filter((row) => Boolean(row.ticker));
    },

    async getStockAssets(marketType: MarketType): Promise<Asset[]> {
        const listings = await this.getListingCompanies();
        const safeLimit = Number.isFinite(STOCK_LIST_LIMIT)
            ? Math.min(Math.max(STOCK_LIST_LIMIT, 10), 300)
            : 80;
        const safeConcurrency = Number.isFinite(STOCK_HISTORY_CONCURRENCY)
            ? Math.min(Math.max(STOCK_HISTORY_CONCURRENCY, 2), 20)
            : 8;
        const shortlist = listings
            .map((row) => row.ticker)
            .filter((ticker): ticker is string => Boolean(ticker))
            .slice(0, safeLimit);

        const nameMap = new Map<string, string>();
        listings.forEach((row) => {
            if (row.ticker) {
                nameMap.set(row.ticker, row.organName || row.ticker);
            }
        });

        const histories: { ticker: string; rows: HistoryRow[] }[] = [];
        for (let i = 0; i < shortlist.length; i += safeConcurrency) {
            const batch = shortlist.slice(i, i + safeConcurrency);
            const batchResult = await Promise.allSettled(
                batch.map(async (ticker) => {
                    const payload = await getLambda<HistoryRow[]>({
                        cmd: "stock_historical_data",
                        symbol: ticker,
                        days: "8",
                        resolution: "1D",
                    });
                    const records = toRecordList(
                        payload.data,
                    ) as unknown as HistoryRow[];
                    return { ticker, rows: records };
                }),
            );
            batchResult.forEach((item) => {
                if (item.status === "fulfilled") {
                    histories.push(item.value);
                }
            });
        }

        return histories
            .filter((item) => item.rows.length > 0)
            .map((item) =>
                toStockAsset(item.ticker, item.rows, marketType, nameMap),
            )
            .sort((a, b) => b.quoteVolumeRaw - a.quoteVolumeRaw);
    },

    async getStockChart(symbol: string, resolution: string, days: number): Promise<OhlcvPoint[]> {
        const payload = await getLambda<Record<string, unknown>[]>({
            cmd: "stock_historical_data",
            symbol,
            resolution,
            days: String(days),
        });
        return mapChartRows(toRecordList(payload.data));
    },
};
