/**
 * DexScreener Adapter (server-side).
 *
 * Docs reference:
 * - https://docs.dexscreener.com/api/reference
 *
 * Cross-chain search approach (v1):
 * - Use `GET /latest/dex/search?q={tokenAddress}` to retrieve pairs across chains.
 * - Parse the response defensively because field availability varies by chain/dex.
 */

const DEXSCREENER_BASE_URL = "https://api.dexscreener.com";

export type DexScreenerPriceChange = {
    h24?: number | null;
};

export type DexScreenerLiquidity = {
    usd?: number | null;
};

export type DexScreenerVolume = {
    h24?: number | null;
};

export type DexScreenerPair = {
    chainId: string;
    pairAddress: string;
    url?: string;

    baseToken: {
        address?: string;
        symbol?: string;
        name?: string;
    };
    quoteToken: {
        symbol?: string;
        address?: string;
    };

    priceUsd?: number | null;
    liquidityUsd?: number | null;
    volumeUsdH24?: number | null;
    fdvUsd?: number | null;
    marketCapUsd?: number | null;
    priceChangeH24Pct?: number | null;
};

export type DexScreenerSearchResponse = {
    pairs: DexScreenerPair[];
    rawCount: number;
};

function parseOptionalNumber(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function coerceString(v: unknown): string | undefined {
    if (typeof v === "string") return v;
    return undefined;
}

function toLowerTrim(v: unknown): string | undefined {
    const s = coerceString(v);
    return s ? s.trim().toLowerCase() : undefined;
}

function parseDexScreenerPair(raw: unknown): DexScreenerPair | null {
    if (!raw || typeof raw !== "object") return null;
    const rec = raw as Record<string, unknown>;

    const chainId = coerceString(rec.chainId) ?? "";
    const pairAddress = coerceString(rec.pairAddress) ?? "";
    if (!chainId || !pairAddress) return null;

    const baseTokenRaw = rec.baseToken as Record<string, unknown> | undefined;
    const quoteTokenRaw = rec.quoteToken as Record<string, unknown> | undefined;

    const priceUsd = parseOptionalNumber(rec.priceUsd);

    const liquidityRaw = rec.liquidity as Record<string, unknown> | undefined;
    const liquidityUsd = liquidityRaw ? parseOptionalNumber(liquidityRaw.usd) : null;

    const volumeRaw = rec.volume as Record<string, unknown> | undefined;
    const volumeUsdH24 = volumeRaw ? parseOptionalNumber(volumeRaw.h24) : null;

    const fdvUsd = parseOptionalNumber(rec.fdv);
    const marketCapUsd = parseOptionalNumber(rec.marketCap);

    // priceChange sometimes comes in `priceChange` object with h24 field
    const priceChangeRaw = rec.priceChange as Record<string, unknown> | undefined;
    const priceChangeH24Pct = priceChangeRaw ? parseOptionalNumber(priceChangeRaw.h24) : null;

    // Also support "priceChange" at top-level if provider changes shape.
    const priceChangeAlt = parseOptionalNumber(rec["priceChangeH24Pct"]);

    const url = coerceString(rec.url);

    return {
        chainId,
        pairAddress,
        url,
        baseToken: {
            address: baseTokenRaw ? coerceString(baseTokenRaw.address) : undefined,
            symbol: baseTokenRaw ? coerceString(baseTokenRaw.symbol) : undefined,
            name: baseTokenRaw ? coerceString(baseTokenRaw.name) : undefined,
        },
        quoteToken: {
            symbol: quoteTokenRaw ? coerceString(quoteTokenRaw.symbol) : undefined,
            address: quoteTokenRaw ? coerceString(quoteTokenRaw.address) : undefined,
        },
        priceUsd,
        liquidityUsd,
        volumeUsdH24,
        fdvUsd,
        marketCapUsd,
        priceChangeH24Pct: priceChangeAlt ?? priceChangeH24Pct,
    };
}

/**
 * Parse DexScreener response defensively.
 */
export function parseDexScreenerSearchResponse(raw: unknown): DexScreenerSearchResponse {
    const fallbackPairs: DexScreenerPair[] = [];

    if (!raw || typeof raw !== "object") {
        return { pairs: fallbackPairs, rawCount: 0 };
    }

    const rec = raw as Record<string, unknown>;

    const pairsRaw = rec.pairs;
    if (Array.isArray(pairsRaw)) {
        const pairs = pairsRaw.map(parseDexScreenerPair).filter((p): p is DexScreenerPair => Boolean(p));
        // de-dup by pairAddress
        const seen = new Set<string>();
        const unique: DexScreenerPair[] = [];
        for (const p of pairs) {
            const key = toLowerTrim(p.pairAddress) ?? p.pairAddress;
            if (!key || seen.has(key)) continue;
            seen.add(key);
            unique.push(p);
        }
        return { pairs: unique, rawCount: pairs.length };
    }

    // Alternative: response may be array of pairs directly.
    if (Array.isArray(raw)) {
        const pairs = raw.map(parseDexScreenerPair).filter((p): p is DexScreenerPair => Boolean(p));
        return { pairs, rawCount: pairs.length };
    }

    return { pairs: fallbackPairs, rawCount: 0 };
}

type CacheEntry = {
    expiresAt: number;
    value: DexScreenerSearchResponse;
};

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

/**
 * Search token pairs across chains by token address.
 */
export async function searchTokenPairsAcrossChains(args: {
    tokenAddress: string;
    limit?: number;
}): Promise<DexScreenerSearchResponse> {
    const tokenAddress = args.tokenAddress.trim();
    const limit = args.limit ?? 30;

    const key = `dexscreener:${tokenAddress.toLowerCase()}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
        return cached.value;
    }

    const url = `${DEXSCREENER_BASE_URL}/latest/dex/search?q=${encodeURIComponent(tokenAddress)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`DexScreener search error ${res.status}: ${text || "empty body"}`);
    }
    const json: unknown = await res.json();
    const parsed = parseDexScreenerSearchResponse(json);

    // Sort by liquidity, then by volume.
    const sorted = parsed.pairs
        .slice()
        .sort((a, b) => (b.liquidityUsd ?? -Infinity) - (a.liquidityUsd ?? -Infinity) ||
            (b.volumeUsdH24 ?? -Infinity) - (a.volumeUsdH24 ?? -Infinity));

    const out: DexScreenerSearchResponse = { pairs: sorted.slice(0, limit), rawCount: parsed.rawCount };
    cache.set(key, { expiresAt: now + CACHE_TTL_MS, value: out });
    return out;
}

