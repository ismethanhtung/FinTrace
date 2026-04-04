import type { Asset } from "./binanceService";
import { toSafeLogoUrl } from "./tokenLogoService";

const BINANCE_ASSET_METADATA_API = "/api/binance/assets";
const LIST_CACHE_KEY = "fintrace_binance_asset_catalog_v2";
const LIST_TTL_MS = 6 * 60 * 60 * 1000;

export type BinanceAssetMetadataEntry = {
    id: string;
    assetCode: string;
    assetName: string;
    unit: string;
    commissionRate: number;
    freeAuditWithdrawAmt: number;
    freeUserChargeAmount: number;
    createTime: number;
    test: number;
    gas: number;
    isLegalMoney: boolean;
    reconciliationAmount: number;
    seqNum: string;
    chineseName: string;
    cnLink: string;
    enLink: string;
    logoUrl: string;
    fullLogoUrl: string;
    supportMarket: string[] | null;
    feeReferenceAsset: string;
    feeRate: number | null;
    feeDigit: number;
    assetDigit: number;
    trading: boolean;
    tags: string[];
    plateType: string;
    etf: boolean;
    isLedgerOnly: boolean;
    delisted: boolean;
    preDelist: boolean;
    tagBits: string;
    pdTradeDeadline: number | null;
    pdDepositDeadline: number | null;
    pdAnnounceUrl: string | null;
    oldAssetCode: string | null;
    newAssetCode: string | null;
    swapTag: string;
    swapAnnounceUrl: string | null;
};

type CachedBinanceAssetMetadata = {
    t: number;
    data: BinanceAssetMetadataEntry[];
};

let memoryList: BinanceAssetMetadataEntry[] | null = null;
let inFlightListPromise: Promise<BinanceAssetMetadataEntry[]> | null = null;

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

function getCachedListFromStorage(): BinanceAssetMetadataEntry[] | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem(LIST_CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CachedBinanceAssetMetadata;
        const hasExtendedFields = (entry: unknown): boolean => {
            if (!entry || typeof entry !== "object") return false;
            const obj = entry as Record<string, unknown>;
            return (
                typeof obj.assetCode === "string" &&
                "unit" in obj &&
                "createTime" in obj &&
                "seqNum" in obj &&
                "freeAuditWithdrawAmt" in obj &&
                "reconciliationAmount" in obj &&
                "cnLink" in obj &&
                "enLink" in obj &&
                "swapTag" in obj
            );
        };
        if (
            Date.now() - parsed.t < LIST_TTL_MS &&
            Array.isArray(parsed.data) &&
            parsed.data.length > 0 &&
            parsed.data.every(hasExtendedFields)
        ) {
            return parsed.data;
        }

        localStorage.removeItem(LIST_CACHE_KEY);
    } catch {
        /* ignore storage parse errors */
    }

    return null;
}

function setCachedListToStorage(data: BinanceAssetMetadataEntry[]): void {
    if (typeof window === "undefined") return;

    try {
        const payload: CachedBinanceAssetMetadata = {
            t: Date.now(),
            data,
        };
        localStorage.setItem(LIST_CACHE_KEY, JSON.stringify(payload));
    } catch {
        /* ignore storage write errors */
    }
}

export function buildBinanceAssetMetadataMap(
    entries: BinanceAssetMetadataEntry[],
): Map<string, BinanceAssetMetadataEntry> {
    const map = new Map<string, BinanceAssetMetadataEntry>();
    for (const entry of entries) {
        const key = normalizeLookupKey(entry.assetCode);
        if (!key) continue;
        map.set(key, entry);
    }
    return map;
}

export async function getCachedBinanceAssetMetadata(): Promise<
    BinanceAssetMetadataEntry[]
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

    inFlightListPromise = fetchJson<BinanceAssetMetadataEntry[]>(
        BINANCE_ASSET_METADATA_API,
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

function uniqueTags(values: string[] | undefined): string[] {
    if (!values?.length) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const tag of values) {
        const value = String(tag ?? "").trim();
        if (!value) continue;
        const key = value.toUpperCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(value);
    }
    return out;
}

function resolveMetadataByAsset(
    asset: Pick<Asset, "id" | "symbol">,
    metadataMap: Map<string, BinanceAssetMetadataEntry>,
): BinanceAssetMetadataEntry | null {
    const symbolKey = normalizeLookupKey(asset.symbol);
    if (symbolKey && metadataMap.has(symbolKey)) {
        return metadataMap.get(symbolKey)!;
    }

    const idKey = normalizeLookupKey(asset.id);
    if (idKey.endsWith("USDT")) {
        const baseKey = idKey.slice(0, -4);
        if (metadataMap.has(baseKey)) return metadataMap.get(baseKey)!;
    }

    return null;
}

/**
 * Enrich coin assets with Binance asset catalog metadata (tags + info tooltip).
 * Safe fallback: if API fails, original asset list is returned unchanged.
 */
export async function enrichAssetsWithBinanceAssetMetadata(
    assets: Asset[],
): Promise<Asset[]> {
    if (assets.length === 0) return assets;

    try {
        const list = await getCachedBinanceAssetMetadata();
        const map = buildBinanceAssetMetadataMap(list);
        return assets.map((asset) => {
            const meta = resolveMetadataByAsset(asset, map);
            if (!meta) return asset;

            const resolvedLogo =
                asset.logoUrl ??
                toSafeLogoUrl(meta.logoUrl) ??
                toSafeLogoUrl(meta.fullLogoUrl) ??
                undefined;

            return {
                ...asset,
                name: meta.assetName || asset.name,
                logoUrl: resolvedLogo,
                tags: uniqueTags(meta.tags),
                binanceAssetInfo: {
                    assetId: meta.id,
                    assetCode: meta.assetCode,
                    assetName: meta.assetName,
                    unit: meta.unit,
                    commissionRate: meta.commissionRate,
                    freeAuditWithdrawAmt: meta.freeAuditWithdrawAmt,
                    freeUserChargeAmount: meta.freeUserChargeAmount,
                    createTime: meta.createTime,
                    test: meta.test,
                    gas: meta.gas,
                    isLegalMoney: meta.isLegalMoney,
                    reconciliationAmount: meta.reconciliationAmount,
                    seqNum: meta.seqNum,
                    chineseName: meta.chineseName,
                    cnLink: meta.cnLink,
                    enLink: meta.enLink,
                    plateType: meta.plateType,
                    supportMarket: meta.supportMarket,
                    feeReferenceAsset: meta.feeReferenceAsset,
                    feeRate: meta.feeRate,
                    feeDigit: meta.feeDigit,
                    assetDigit: meta.assetDigit,
                    trading: meta.trading,
                    etf: meta.etf,
                    isLedgerOnly: meta.isLedgerOnly,
                    delisted: meta.delisted,
                    preDelist: meta.preDelist,
                    tagBits: meta.tagBits,
                    logoUrl: meta.logoUrl,
                    fullLogoUrl: meta.fullLogoUrl,
                    pdTradeDeadline: meta.pdTradeDeadline,
                    pdDepositDeadline: meta.pdDepositDeadline,
                    pdAnnounceUrl: meta.pdAnnounceUrl,
                    oldAssetCode: meta.oldAssetCode,
                    newAssetCode: meta.newAssetCode,
                    swapTag: meta.swapTag,
                    swapAnnounceUrl: meta.swapAnnounceUrl,
                },
            };
        });
    } catch (error) {
        console.warn(
            "[binanceAssetMetadataService] enrichAssetsWithBinanceAssetMetadata:",
            error,
        );
        return assets;
    }
}

export function resetBinanceAssetMetadataServiceForTests(): void {
    memoryList = null;
    inFlightListPromise = null;
}
