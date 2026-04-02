export type VietcapDepthLevel = {
    price: number;
    quantity: number;
};

export type VietcapBoardSnapshotSymbolState = {
    symbol: string;
    ref?: number;
    ceiling?: number;
    floor?: number;
    bid?: VietcapDepthLevel[];
    offer?: VietcapDepthLevel[];
    price?: number;
    quantity?: number;
    totalVolumeTraded?: number;
    highestPrice?: number;
    lowestPrice?: number;
    foreignBuy?: number;
    foreignSell?: number;
    foreignRoom?: number;
    companyName?: string;
    exchange?: string;
    isin?: string;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as JsonRecord)
        : null;
}

function readNumber(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value !== "string") return undefined;
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return undefined;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function readString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeSymbol(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toUpperCase();
    if (!normalized) return null;
    if (!/^[A-Z0-9]{1,24}$/.test(normalized)) return null;
    return normalized;
}

function addLevel(
    levels: VietcapDepthLevel[],
    price: number | undefined,
    quantity: number | undefined,
) {
    if (!Number.isFinite(price) || !Number.isFinite(quantity)) return;
    levels.push({ price: price!, quantity: quantity! });
}

function normalizeBidLevels(row: JsonRecord): VietcapDepthLevel[] | undefined {
    const levels: VietcapDepthLevel[] = [];
    // Keep canonical order as level 1 -> 2 -> 3.
    // Board page maps buy by [2 - idx] to render columns "Giá 3,2,1".
    addLevel(levels, readNumber(row.bp1), readNumber(row.bv1));
    addLevel(levels, readNumber(row.bp2), readNumber(row.bv2));
    addLevel(levels, readNumber(row.bp3), readNumber(row.bv3));
    return levels.length ? levels : undefined;
}

function normalizeOfferLevels(
    row: JsonRecord,
): VietcapDepthLevel[] | undefined {
    const levels: VietcapDepthLevel[] = [];
    addLevel(levels, readNumber(row.ap1), readNumber(row.av1));
    addLevel(levels, readNumber(row.ap2), readNumber(row.av2));
    addLevel(levels, readNumber(row.ap3), readNumber(row.av3));
    return levels.length ? levels : undefined;
}

export function toVietcapBoardSnapshotState(
    value: unknown,
): VietcapBoardSnapshotSymbolState | null {
    const row = asRecord(value);
    if (!row) return null;

    const symbol =
        normalizeSymbol(row.s) ??
        normalizeSymbol(row.symbol) ??
        normalizeSymbol(row.ticker);
    if (!symbol) return null;

    const bid = normalizeBidLevels(row);
    const offer = normalizeOfferLevels(row);
    const state: VietcapBoardSnapshotSymbolState = {
        symbol,
        ref: readNumber(row.ref),
        ceiling: readNumber(row.cei),
        floor: readNumber(row.flo),
        bid,
        offer,
        price: readNumber(row.c),
        quantity: readNumber(row.mv),
        totalVolumeTraded: readNumber(row.vo),
        highestPrice: readNumber(row.h),
        lowestPrice: readNumber(row.l),
        foreignBuy: readNumber(row.frbv),
        foreignSell: readNumber(row.frsv),
        foreignRoom: readNumber(row.frcrr),
        companyName: readString(row.orgn) ?? readString(row.enorgn),
        exchange: readString(row.bo),
        isin: readString(row.co),
    };

    return state;
}

export function mapVietcapSnapshotBySymbol(
    rows: unknown,
): Record<string, VietcapBoardSnapshotSymbolState> {
    if (!Array.isArray(rows)) return {};
    const out: Record<string, VietcapBoardSnapshotSymbolState> = {};
    for (const row of rows) {
        const normalized = toVietcapBoardSnapshotState(row);
        if (!normalized) continue;
        out[normalized.symbol] = normalized;
    }
    return out;
}
