type JsonRecord = Record<string, unknown>;

export type VietcapMarketIndexState = {
    symbol: string;
    board?: string;
    value: number;
    refPrice: number;
    change: number;
    changePercent: number;
    totalShares: number;
    totalValue: number;
    totalStockCeiling: number;
    totalStockIncrease: number;
    totalStockNoChange: number;
    totalStockDecline: number;
    time?: string;
};

function asRecord(value: unknown): JsonRecord | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as JsonRecord)
        : null;
}

function readNumber(value: unknown): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value !== "string") return 0;
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return 0;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}

function readString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeMarketIndexSymbol(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const normalized = raw.trim().toUpperCase();
    if (!normalized) return null;
    if (normalized === "HNXINDEX") return "HNXINDEX";
    if (normalized === "HNXUPCOMINDEX") return "UPCOM";
    if (normalized === "UPCOMINDEX") return "UPCOM";
    if (normalized === "UPCOM") return "UPCOM";
    if (normalized === "VNINDEX") return "VNINDEX";
    if (normalized === "VN30") return "VN30";
    if (normalized === "HNX30") return "HNX30";
    if (normalized === "VNXALL") return "VNXALL";
    return null;
}

export function toVietcapMarketIndexState(
    value: unknown,
): VietcapMarketIndexState | null {
    const row = asRecord(value);
    if (!row) return null;
    const symbol = normalizeMarketIndexSymbol(row.symbol);
    if (!symbol) return null;

    const price = readNumber(row.price);
    const refPrice = readNumber(row.refPrice);
    const change =
        readNumber(row.change) || (refPrice > 0 ? price - refPrice : 0);
    const changePercent =
        readNumber(row.changePercent) ||
        (refPrice > 0 ? (change / refPrice) * 100 : 0);

    return {
        symbol,
        board: readString(row.board),
        value: price,
        refPrice,
        change,
        changePercent,
        totalShares: readNumber(row.totalShares),
        totalValue: readNumber(row.totalValue),
        totalStockCeiling: readNumber(row.totalStockCeiling),
        totalStockIncrease: readNumber(row.totalStockIncrease),
        totalStockNoChange: readNumber(row.totalStockNoChange),
        totalStockDecline: readNumber(row.totalStockDecline),
        time: readString(row.time),
    };
}

export function mapVietcapMarketIndexBySymbol(
    rows: unknown,
): Record<string, VietcapMarketIndexState> {
    if (!Array.isArray(rows)) return {};
    const out: Record<string, VietcapMarketIndexState> = {};
    for (const row of rows) {
        const normalized = toVietcapMarketIndexState(row);
        if (!normalized) continue;
        out[normalized.symbol] = normalized;
    }
    return out;
}
