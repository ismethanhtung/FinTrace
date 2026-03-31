import type { AssetUniverse } from "./marketUniverse";

type ResolvedUniverseSymbol = {
    normalized: string | null;
    isValid: boolean;
};

function normalizeRawSymbol(symbol: string): string {
    return String(symbol || "").trim().toUpperCase();
}

function normalizeCoinSymbol(symbol: string): string | null {
    const upper = normalizeRawSymbol(symbol);
    if (!upper) return null;
    // Coin feeds in this app are USDT pairs only (spot + USD-M futures).
    if (!/^[A-Z0-9_]+USDT$/.test(upper)) return null;
    return upper;
}

function normalizeStockSymbol(symbol: string): string | null {
    const upper = normalizeRawSymbol(symbol).replace(/-(C|F)$/i, "");
    if (!upper) return null;
    // VN stock tickers can include letters and digits (e.g. BSR, VNM, FTS, A32).
    if (!/^[A-Z0-9]{1,12}$/.test(upper)) return null;
    if (upper.endsWith("USDT")) return null;
    return upper;
}

export function resolveUniverseSymbol(
    symbol: string,
    universe: AssetUniverse,
): ResolvedUniverseSymbol {
    const normalized =
        universe === "coin"
            ? normalizeCoinSymbol(symbol)
            : normalizeStockSymbol(symbol);
    return { normalized, isValid: Boolean(normalized) };
}

export function toNewsBaseSymbol(
    symbol: string,
    universe: AssetUniverse,
): string | null {
    const { normalized } = resolveUniverseSymbol(symbol, universe);
    if (!normalized) return null;
    return universe === "coin"
        ? normalized.replace(/USDT$/, "").replace(/USD$/, "")
        : normalized;
}
