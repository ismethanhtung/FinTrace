type JsonRecord = Record<string, unknown>;

export type DnseDepthLevel = {
    price: number;
    quantity: number;
};

export type DnseBoardSymbolState = {
    symbol: string;
    ref?: number;
    ceiling?: number;
    floor?: number;
    bid?: DnseDepthLevel[];
    offer?: DnseDepthLevel[];
    totalBidQtty?: number;
    totalOfferQtty?: number;
    price?: number;
    quantity?: number;
    totalVolumeTraded?: number;
    highestPrice?: number;
    lowestPrice?: number;
};

const NESTED_KEYS = [
    "data",
    "d",
    "payload",
    "message",
    "messages",
    "item",
    "items",
    "record",
    "records",
    "list",
    "result",
] as const;

function asRecord(value: unknown): JsonRecord | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as JsonRecord)
        : null;
}

function normalizeSymbol(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toUpperCase();
    if (!normalized) return null;
    if (!/^[A-Z0-9]{1,24}$/.test(normalized)) return null;
    return normalized;
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

function readDepthLevels(value: unknown): DnseDepthLevel[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const levels = value
        .map((level) => {
            const row = asRecord(level);
            if (!row) return null;
            const price = readNumber(row.price);
            const quantity =
                readNumber(row.quantity) ??
                readNumber(row.qtty) ??
                readNumber(row.qty) ??
                readNumber(row.volume);
            if (price == null || quantity == null) return null;
            return { price, quantity } satisfies DnseDepthLevel;
        })
        .filter((level): level is DnseDepthLevel => Boolean(level));

    return levels.length ? levels : undefined;
}

function toSymbolPatch(record: JsonRecord): DnseBoardSymbolState | null {
    const symbol =
        normalizeSymbol(record.symbol) ??
        normalizeSymbol(record.s) ??
        normalizeSymbol(record.ticker);
    if (!symbol) return null;

    const patch: DnseBoardSymbolState = { symbol };
    let hasData = false;

    const ref = readNumber(record.basicPrice) ?? readNumber(record.basic_price);
    const ceiling =
        readNumber(record.ceilingPrice) ?? readNumber(record.ceiling_price);
    const floor = readNumber(record.floorPrice) ?? readNumber(record.floor_price);
    if (ref != null) {
        patch.ref = ref;
        hasData = true;
    }
    if (ceiling != null) {
        patch.ceiling = ceiling;
        hasData = true;
    }
    if (floor != null) {
        patch.floor = floor;
        hasData = true;
    }

    const bid =
        readDepthLevels(record.bid) ??
        readDepthLevels(record.bids) ??
        readDepthLevels(record.buy);
    const offer =
        readDepthLevels(record.offer) ??
        readDepthLevels(record.asks) ??
        readDepthLevels(record.sell);
    if (bid) {
        patch.bid = bid;
        hasData = true;
    }
    if (offer) {
        patch.offer = offer;
        hasData = true;
    }

    const totalBidQtty = readNumber(record.totalBidQtty);
    const totalOfferQtty =
        readNumber(record.totalOfferQtty) ??
        readNumber(record.total_offer_qtty);
    const normalizedTotalBidQtty =
        totalBidQtty ?? readNumber(record.total_bid_qtty);
    if (totalBidQtty != null) {
        patch.totalBidQtty = totalBidQtty;
        hasData = true;
    }
    if (normalizedTotalBidQtty != null) {
        patch.totalBidQtty = normalizedTotalBidQtty;
        hasData = true;
    }
    if (totalOfferQtty != null) {
        patch.totalOfferQtty = totalOfferQtty;
        hasData = true;
    }

    const price =
        readNumber(record.price) ??
        readNumber(record.lastPrice) ??
        readNumber(record.matchedPrice) ??
        readNumber(record.matchPrice) ??
        readNumber(record.match_price) ??
        readNumber(record.close);
    const quantity =
        readNumber(record.quantity) ??
        readNumber(record.match_qtty) ??
        readNumber(record.qtty) ??
        readNumber(record.qty);
    const totalVolumeTraded =
        readNumber(record.totalVolumeTraded) ??
        readNumber(record.totalVolume) ??
        readNumber(record.totalMatchVolume) ??
        readNumber(record.total_volume_traded) ??
        readNumber(record.volume);
    const highestPrice =
        readNumber(record.highestPrice) ??
        readNumber(record.highest_price) ??
        readNumber(record.high);
    const lowestPrice =
        readNumber(record.lowestPrice) ??
        readNumber(record.lowest_price) ??
        readNumber(record.low);

    if (price != null) {
        patch.price = price;
        hasData = true;
    }
    if (quantity != null) {
        patch.quantity = quantity;
        hasData = true;
    }
    if (totalVolumeTraded != null) {
        patch.totalVolumeTraded = totalVolumeTraded;
        hasData = true;
    }
    if (highestPrice != null) {
        patch.highestPrice = highestPrice;
        hasData = true;
    }
    if (lowestPrice != null) {
        patch.lowestPrice = lowestPrice;
        hasData = true;
    }

    return hasData ? patch : null;
}

function collectFromNode(
    node: unknown,
    out: DnseBoardSymbolState[],
    seen: WeakSet<object>,
    depth: number,
): void {
    if (depth > 5) return;

    if (Array.isArray(node)) {
        for (const item of node) {
            collectFromNode(item, out, seen, depth + 1);
        }
        return;
    }

    const record = asRecord(node);
    if (!record) return;
    if (seen.has(record)) return;
    seen.add(record);

    const patch = toSymbolPatch(record);
    if (patch) out.push(patch);

    for (const key of NESTED_KEYS) {
        if (record[key] !== undefined) {
            collectFromNode(record[key], out, seen, depth + 1);
        }
    }
}

export function extractDnseBoardPatches(payload: unknown): DnseBoardSymbolState[] {
    const patches: DnseBoardSymbolState[] = [];
    collectFromNode(payload, patches, new WeakSet<object>(), 0);
    return patches;
}

export function mergeDnseBoardState(
    prev: Record<string, DnseBoardSymbolState>,
    patches: DnseBoardSymbolState[],
): Record<string, DnseBoardSymbolState> {
    if (!patches.length) return prev;
    const next = { ...prev };

    for (const patch of patches) {
        const prevSymbol = next[patch.symbol] ?? { symbol: patch.symbol };
        next[patch.symbol] = {
            ...prevSymbol,
            ...patch,
        };
    }

    return next;
}
