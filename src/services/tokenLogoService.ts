/**
 * Token logo resolution via Binance marketing symbol metadata.
 *
 * Runtime flow:
 * - Browser fetches same-origin `/api/binance/marketing-symbols`
 * - Route handler fetches Binance marketing metadata server-side
 * - Client caches the compact metadata in memory + localStorage
 *
 * This avoids CoinGecko rate limits and keeps one logo source for both
 * spot and futures assets.
 */

import { BINANCE_LOGO_KEY_OVERRIDES } from "../config/tokenLogoOverrides";
import type { Asset } from "./binanceService";

const BINANCE_MARKETING_SYMBOLS_API = "/api/binance/marketing-symbols";
const BINANCE_LOGO_PROXY_API = "/api/binance/logo";
const LIST_CACHE_KEY = "fintrace_binance_marketing_symbols_v1";
const LIST_TTL_MS = 6 * 60 * 60 * 1000;

export type BinanceMarketingSymbolEntry = {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    logo: string;
    mapperName?: string;
    hidden?: number;
};

export type BinanceLogoCatalog = {
    bySymbol: Map<string, BinanceMarketingSymbolEntry>;
    byBaseAsset: Map<string, BinanceMarketingSymbolEntry>;
    byMapperName: Map<string, BinanceMarketingSymbolEntry>;
};

type CachedBinanceMarketingSymbols = {
    t: number;
    data: BinanceMarketingSymbolEntry[];
};

let memoryList: BinanceMarketingSymbolEntry[] | null = null;
let memoryCatalog: BinanceLogoCatalog | null = null;
let inFlightListPromise: Promise<BinanceMarketingSymbolEntry[]> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
        headers: { Accept: "application/json" },
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${url}`);
    }
    return response.json() as Promise<T>;
}

function normalizeLookupKey(value: string | null | undefined): string {
    return (value ?? "").trim().toUpperCase();
}

export function toSafeLogoUrl(logoUrl: string | null | undefined): string | null {
    if (!logoUrl) return null;

    if (logoUrl.startsWith("/")) {
        return logoUrl;
    }

    try {
        const parsed = new URL(logoUrl);
        if (parsed.hostname === "bin.bnbstatic.com") {
            return `${BINANCE_LOGO_PROXY_API}?url=${encodeURIComponent(logoUrl)}`;
        }
    } catch {
        return null;
    }

    return logoUrl;
}

function getEntryScore(entry: BinanceMarketingSymbolEntry): number {
    let score = 0;

    if (entry.logo) score += 1000;
    if (entry.quoteAsset === "USDT") score += 200;
    if (entry.hidden === 0) score += 50;
    if (entry.symbol.endsWith("USDT")) score += 20;
    if (entry.mapperName) score += 10;

    return score;
}

function setPreferredEntry(
    map: Map<string, BinanceMarketingSymbolEntry>,
    key: string,
    entry: BinanceMarketingSymbolEntry,
): void {
    if (!key) return;

    const current = map.get(key);
    if (!current || getEntryScore(entry) > getEntryScore(current)) {
        map.set(key, entry);
    }
}

function getCachedListFromStorage(): BinanceMarketingSymbolEntry[] | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem(LIST_CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CachedBinanceMarketingSymbols;
        if (
            Date.now() - parsed.t < LIST_TTL_MS &&
            Array.isArray(parsed.data) &&
            parsed.data.length > 0
        ) {
            return parsed.data;
        }
    } catch {
        /* ignore storage parse errors */
    }

    return null;
}

function setCachedListToStorage(data: BinanceMarketingSymbolEntry[]): void {
    if (typeof window === "undefined") return;

    try {
        const payload: CachedBinanceMarketingSymbols = {
            t: Date.now(),
            data,
        };
        localStorage.setItem(LIST_CACHE_KEY, JSON.stringify(payload));
    } catch {
        /* ignore storage write errors */
    }
}

export function buildBinanceLogoCatalog(
    entries: BinanceMarketingSymbolEntry[],
): BinanceLogoCatalog {
    const bySymbol = new Map<string, BinanceMarketingSymbolEntry>();
    const byBaseAsset = new Map<string, BinanceMarketingSymbolEntry>();
    const byMapperName = new Map<string, BinanceMarketingSymbolEntry>();

    for (const entry of entries) {
        const symbolKey = normalizeLookupKey(entry.symbol);
        const baseAssetKey = normalizeLookupKey(entry.baseAsset);
        const mapperNameKey = normalizeLookupKey(entry.mapperName);

        setPreferredEntry(bySymbol, symbolKey, entry);
        setPreferredEntry(byBaseAsset, baseAssetKey, entry);

        if (mapperNameKey) {
            setPreferredEntry(byMapperName, mapperNameKey, entry);
        }
    }

    return {
        bySymbol,
        byBaseAsset,
        byMapperName,
    };
}

export async function getCachedBinanceMarketingSymbols(): Promise<
    BinanceMarketingSymbolEntry[]
> {
    if (memoryList?.length) return memoryList;

    const cached = getCachedListFromStorage();
    if (cached?.length) {
        memoryList = cached;
        return memoryList;
    }

    if (inFlightListPromise) {
        return inFlightListPromise;
    }

    inFlightListPromise = fetchJson<BinanceMarketingSymbolEntry[]>(
        BINANCE_MARKETING_SYMBOLS_API,
    )
        .then((data) => {
            memoryList = data;
            setCachedListToStorage(data);
            return data;
        })
        .finally(() => {
            inFlightListPromise = null;
        });

    return inFlightListPromise;
}

async function getBinanceLogoCatalog(): Promise<BinanceLogoCatalog> {
    if (memoryCatalog) return memoryCatalog;

    const list = await getCachedBinanceMarketingSymbols();
    memoryCatalog = buildBinanceLogoCatalog(list);
    return memoryCatalog;
}

function getAssetBaseSymbol(asset: Pick<Asset, "id" | "symbol">): string {
    const symbol = normalizeLookupKey(asset.symbol);
    if (symbol) return symbol;

    const assetId = normalizeLookupKey(asset.id);
    if (assetId.endsWith("USDT")) {
        return assetId.slice(0, -4);
    }

    return assetId;
}

function getOverrideKeys(asset: Pick<Asset, "id" | "symbol">): string[] {
    const assetId = normalizeLookupKey(asset.id);
    const baseSymbol = getAssetBaseSymbol(asset);
    const keys = [assetId, baseSymbol]
        .map((key) => BINANCE_LOGO_KEY_OVERRIDES[key])
        .filter(Boolean)
        .map((key) => normalizeLookupKey(key));

    return [...new Set(keys)];
}

function resolveEntryFromCatalog(
    asset: Pick<Asset, "id" | "symbol">,
    catalog: BinanceLogoCatalog,
): BinanceMarketingSymbolEntry | null {
    const assetId = normalizeLookupKey(asset.id);
    const baseSymbol = getAssetBaseSymbol(asset);
    const overrideKeys = getOverrideKeys(asset);

    const symbolCandidates = [
        ...overrideKeys,
        assetId,
        `${baseSymbol}USDT`,
    ].filter(Boolean);

    for (const key of symbolCandidates) {
        const match = catalog.bySymbol.get(key);
        if (match?.logo) return match;
    }

    const baseCandidates = [...overrideKeys, baseSymbol].filter(Boolean);

    for (const key of baseCandidates) {
        const match = catalog.byBaseAsset.get(key);
        if (match?.logo) return match;
    }

    for (const key of baseCandidates) {
        const match = catalog.byMapperName.get(key);
        if (match?.logo) return match;
    }

    return null;
}

export function resolveBinanceLogoUrl(
    asset: Pick<Asset, "id" | "symbol">,
    catalog: BinanceLogoCatalog,
): string | null {
    return resolveEntryFromCatalog(asset, catalog)?.logo ?? null;
}

/**
 * Gắn `logoUrl` cho từng asset bằng metadata marketing của Binance.
 * Safe fallback: nếu không resolve được logo, asset vẫn được trả về nguyên vẹn.
 */
export async function enrichAssetsWithLogos(assets: Asset[]): Promise<Asset[]> {
    if (assets.length === 0) return assets;

    try {
        const catalog = await getBinanceLogoCatalog();
        return assets.map((asset) => ({
            ...asset,
            logoUrl:
                toSafeLogoUrl(resolveBinanceLogoUrl(asset, catalog)) ?? undefined,
        }));
    } catch (error) {
        console.warn("[tokenLogoService] enrichAssetsWithLogos:", error);
        return assets;
    }
}

export function resetTokenLogoServiceForTests(): void {
    memoryList = null;
    memoryCatalog = null;
    inFlightListPromise = null;
}
