import { NextResponse } from "next/server";
import {
    NetworkMapPayload,
    normalizeNetworks,
} from "../../../../lib/marketNetwork";

type CoinGeckoListItem = {
    id: string;
    symbol: string;
    platforms?: Record<string, string>;
};

type CoinGeckoMarketItem = {
    id: string;
    symbol: string;
};

const COINGECKO_URL =
    "https://api.coingecko.com/api/v3/coins/list?include_platform=true";
const COINGECKO_MARKETS_URL =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&sparkline=false&per_page=250&page=";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;
const PRIMARY_PRIORITY = [
    "ethereum",
    "bsc",
    "base",
    "solana",
    "tron",
    "avalanche",
    "polkadot",
];

let cache: NetworkMapPayload | null = null;
let cacheExpiry = 0;
let inflight: Promise<NetworkMapPayload> | null = null;

async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: "application/json",
            },
        });
        if (!res.ok) {
            throw new Error(`CoinGecko error: ${res.status}`);
        }
        return (await res.json()) as T;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchPreferredCoinIdBySymbol(): Promise<Record<string, string>> {
    // Pick preferred ID per symbol from top market-cap list to avoid symbol collisions.
    const pages = [1, 2, 3, 4];
    const pageData = await Promise.all(
        pages.map((page) =>
            fetchJsonWithTimeout<CoinGeckoMarketItem[]>(
                `${COINGECKO_MARKETS_URL}${page}`,
            ),
        ),
    );
    const preferred: Record<string, string> = {};
    for (const items of pageData) {
        for (const item of items) {
            const symbol = item.symbol?.toUpperCase();
            if (!symbol) continue;
            if (!preferred[symbol]) preferred[symbol] = item.id;
        }
    }
    return preferred;
}

function pickPrimaryNetwork(networks: string[]): string {
    for (const key of PRIMARY_PRIORITY) {
        if (networks.includes(key)) return key;
    }
    return networks[0] ?? "other";
}

async function fetchCoinGeckoSymbolNetworkMap(): Promise<NetworkMapPayload> {
    const [preferredIdBySymbol, list] = await Promise.all([
        fetchPreferredCoinIdBySymbol(),
        fetchJsonWithTimeout<CoinGeckoListItem[]>(COINGECKO_URL),
    ]);

    const byIdNetworks: Record<string, string[]> = {};
    for (const item of list) {
        const keys = Object.keys(item.platforms || {});
        const normalized = normalizeNetworks(keys);
        if (!normalized.length) continue;
        byIdNetworks[item.id] = normalized;
    }

    const out: Record<string, string[]> = {};
    const bySymbolPrimary: Record<string, string> = {};
    for (const [symbol, preferredId] of Object.entries(preferredIdBySymbol)) {
        const nets = byIdNetworks[preferredId];
        if (!nets || !nets.length) continue;
        out[symbol] = nets;
        bySymbolPrimary[symbol] = pickPrimaryNetwork(nets);
    }

    return {
        updatedAt: Date.now(),
        bySymbol: out,
        bySymbolPrimary,
    };
}

async function getNetworkMap(): Promise<NetworkMapPayload> {
    const now = Date.now();
    if (cache && now < cacheExpiry) return cache;
    if (inflight) return inflight;

    inflight = fetchCoinGeckoSymbolNetworkMap()
        .then((next) => {
            cache = next;
            cacheExpiry = Date.now() + CACHE_TTL_MS;
            return next;
        })
        .finally(() => {
            inflight = null;
        });

    try {
        return await inflight;
    } catch (error) {
        if (cache) return cache;
        throw error;
    }
}

export async function GET() {
    try {
        const data = await getNetworkMap();
        return NextResponse.json(data, {
            headers: {
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                message:
                    error instanceof Error
                        ? error.message
                        : "Cannot build market network map",
                updatedAt: cache?.updatedAt ?? 0,
                bySymbol: cache?.bySymbol ?? {},
                bySymbolPrimary: cache?.bySymbolPrimary ?? {},
            },
            { status: 200 },
        );
    }
}
