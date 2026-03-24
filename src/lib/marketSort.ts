import type { MarketTableRow } from "../hooks/useMarketPageData";

export type MarketSubTabKey =
    | "Top"
    | "Trending"
    | "New"
    | "Most Visited"
    | "Gainers"
    | "More";

export type MoreSortKey = "Losers" | "Highest Volume" | "Most Volatile";

function safeNumber(v: number | null | undefined): number {
    return Number.isFinite(v) ? (v as number) : 0;
}

function stableSort(
    rows: MarketTableRow[],
    cmp: (a: MarketTableRow, b: MarketTableRow) => number,
): MarketTableRow[] {
    return rows
        .map((row, idx) => ({ row, idx }))
        .sort((a, b) => {
            const out = cmp(a.row, b.row);
            if (out !== 0) return out;
            return a.idx - b.idx;
        })
        .map((x) => x.row);
}

function cmpTop(a: MarketTableRow, b: MarketTableRow): number {
    return (
        b.volumeRaw - a.volumeRaw ||
        safeNumber(b.h24) - safeNumber(a.h24) ||
        a.symbol.localeCompare(b.symbol)
    );
}

function cmpGainers(a: MarketTableRow, b: MarketTableRow): number {
    return safeNumber(b.h24) - safeNumber(a.h24) || cmpTop(a, b);
}

function cmpLosers(a: MarketTableRow, b: MarketTableRow): number {
    return safeNumber(a.h24) - safeNumber(b.h24) || cmpTop(a, b);
}

function cmpHighestVolume(a: MarketTableRow, b: MarketTableRow): number {
    return b.volumeRaw - a.volumeRaw || a.symbol.localeCompare(b.symbol);
}

function cmpMostVolatile(a: MarketTableRow, b: MarketTableRow): number {
    const av = Math.abs(safeNumber(a.h24)) + Math.abs(safeNumber(a.h1));
    const bv = Math.abs(safeNumber(b.h24)) + Math.abs(safeNumber(b.h1));
    return bv - av || cmpTop(a, b);
}

// log10 of absolute percent change, bounded. 0% → 0, 1% → 0, 10% → 1, 100% → 2.
function logChange(pct: number | null | undefined): number {
    const abs = Math.abs(safeNumber(pct));
    return abs < 1 ? 0 : Math.log10(abs);
}

function cmpTrending(a: MarketTableRow, b: MarketTableRow): number {
    // Trending = high buzz relative to size. Both signals log-scaled to same range.
    const score = (r: MarketTableRow) =>
        logChange(r.h24) * 5 +
        logChange(r.h1) * 2 +
        logChange(r.d7) * 1 +
        Math.log10(r.volumeRaw + 1) * 2;
    return score(b) - score(a) || cmpTop(a, b);
}

function cmpNew(a: MarketTableRow, b: MarketTableRow): number {
    // Proxy for "new": lower established volume + active short-term trading.
    // Uses log-scale so the gap between $1K and $1M is the same as $1M and $1B.
    return (
        Math.log10(a.volumeRaw + 1) - Math.log10(b.volumeRaw + 1) ||
        logChange(b.h1) - logChange(a.h1) ||
        a.symbol.localeCompare(b.symbol)
    );
}

function cmpMostVisited(a: MarketTableRow, b: MarketTableRow): number {
    // Most visited = dominated by volume (trading activity), slight boost for buzzworthy moves.
    const score = (r: MarketTableRow) =>
        Math.log10(r.volumeRaw + 1) * 3 + logChange(r.h24);
    return score(b) - score(a) || cmpTop(a, b);
}

export function sortMarketRowsBySubTab(
    rows: MarketTableRow[],
    subTab: MarketSubTabKey,
    moreSort: MoreSortKey,
): MarketTableRow[] {
    if (!rows.length) return rows;
    switch (subTab) {
        case "Top":
            return stableSort(rows, cmpTop);
        case "Trending":
            return stableSort(rows, cmpTrending);
        case "New":
            return stableSort(rows, cmpNew);
        case "Most Visited":
            return stableSort(rows, cmpMostVisited);
        case "Gainers":
            return stableSort(rows, cmpGainers);
        case "More":
            if (moreSort === "Losers") return stableSort(rows, cmpLosers);
            if (moreSort === "Most Volatile")
                return stableSort(rows, cmpMostVolatile);
            return stableSort(rows, cmpHighestVolume);
        default:
            return rows;
    }
}
