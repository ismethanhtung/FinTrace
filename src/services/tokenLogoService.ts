/**
 * Token logo resolution via CoinGecko public API.
 *
 * - Danh sách coin: GET /api/v3/coins/list (cache bộ nhớ + localStorage)
 * - Ảnh: GET /api/v3/coins/markets (batch theo `ids`, cache theo coin id)
 *
 * Docs: https://docs.coingecko.com/reference/coins-list
 *       https://docs.coingecko.com/reference/coins-markets
 */

import { COINGECKO_ID_OVERRIDES } from "../config/tokenLogoOverrides";
import type { Asset } from "./binanceService";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

const LIST_CACHE_KEY = "fintrace_coingecko_coins_list_v1";
/** Giảm tải API; danh sách coin thay đổi ít. */
const LIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CoinListEntry = {
    id: string;
    symbol: string;
    name: string;
};

let memoryList: CoinListEntry[] | null = null;
/** CoinGecko coin id → image URL (small/markets `image` field). */
const imageByCoinGeckoId = new Map<string, string>();

async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, {
        headers: { Accept: "application/json" },
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${url}`);
    }
    return res.json() as Promise<T>;
}

export async function getCachedCoinList(): Promise<CoinListEntry[]> {
    if (memoryList?.length) return memoryList;

    if (typeof window !== "undefined") {
        try {
            const raw = localStorage.getItem(LIST_CACHE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as {
                    t: number;
                    data: CoinListEntry[];
                };
                if (
                    Date.now() - parsed.t < LIST_TTL_MS &&
                    Array.isArray(parsed.data)
                ) {
                    memoryList = parsed.data;
                    return memoryList;
                }
            }
        } catch {
            /* ignore */
        }
    }

    const data = await fetchJson<CoinListEntry[]>(
        `${COINGECKO_API}/coins/list`,
    );
    memoryList = data;
    if (typeof window !== "undefined") {
        try {
            localStorage.setItem(
                LIST_CACHE_KEY,
                JSON.stringify({ t: Date.now(), data }),
            );
        } catch {
            /* ignore */
        }
    }
    return data;
}

/**
 * Map base asset (Binance) → CoinGecko `id`.
 * Khi nhiều coin cùng ticker, ưu tiên id trùng chữ thường với symbol, rồi id ngắn hơn (heuristic).
 */
export function resolveCoinGeckoId(
    baseSymbol: string,
    entries: CoinListEntry[],
): string | null {
    const upper = baseSymbol.trim().toUpperCase();
    const manual = COINGECKO_ID_OVERRIDES[upper];
    if (manual) return manual;

    const matches = entries.filter(
        (e) => e.symbol.toUpperCase() === upper,
    );
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0].id;

    const lower = upper.toLowerCase();
    const exactId = matches.find((m) => m.id === lower);
    if (exactId) return exactId.id;

    const sorted = [...matches].sort((a, b) => {
        const la = a.id.length;
        const lb = b.id.length;
        if (la !== lb) return la - lb;
        return a.id.localeCompare(b.id);
    });
    return sorted[0]?.id ?? null;
}

type MarketRow = { id: string; image: string };

const MARKETS_CHUNK = 180;

async function fetchMarketImagesForIds(ids: string[]): Promise<void> {
    const pending = ids.filter((id) => !imageByCoinGeckoId.has(id));
    if (pending.length === 0) return;

    for (let i = 0; i < pending.length; i += MARKETS_CHUNK) {
        const chunk = pending.slice(i, i + MARKETS_CHUNK);
        const idsParam = chunk.map((id) => encodeURIComponent(id)).join(",");
        const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${idsParam}&per_page=${MARKETS_CHUNK}&page=1`;
        let rows: MarketRow[];
        try {
            rows = await fetchJson<MarketRow[]>(url);
        } catch {
            continue;
        }
        for (const row of rows) {
            if (row?.id && row.image) {
                imageByCoinGeckoId.set(row.id, row.image);
            }
        }
    }
}

/**
 * Gắn `logoUrl` cho từng asset (theo Binance `symbol` base → CoinGecko).
 * Idempotent: lần sau chỉ gọi markets cho coin id chưa có trong cache.
 */
export async function enrichAssetsWithLogos(assets: Asset[]): Promise<Asset[]> {
    if (assets.length === 0) return assets;

    try {
        const list = await getCachedCoinList();
        const coinGeckoIdByAssetId = new Map<string, string>();

        for (const a of assets) {
            const cgId = resolveCoinGeckoId(a.symbol, list);
            if (cgId) coinGeckoIdByAssetId.set(a.id, cgId);
        }

        const uniqueIds = [
            ...new Set(coinGeckoIdByAssetId.values()),
        ] as string[];
        await fetchMarketImagesForIds(uniqueIds);

        return assets.map((a) => {
            const cgId = coinGeckoIdByAssetId.get(a.id);
            const logoUrl = cgId
                ? imageByCoinGeckoId.get(cgId) ?? null
                : null;
            return { ...a, logoUrl: logoUrl ?? undefined };
        });
    } catch (e) {
        console.warn("[tokenLogoService] enrichAssetsWithLogos:", e);
        return assets;
    }
}
