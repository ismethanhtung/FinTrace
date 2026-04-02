import type { Asset, MarketType } from "./binanceService";
import type { VietcapBoardSnapshotSymbolState } from "../lib/vietcap/boardSnapshot";
import { vietcapBoardSnapshotService } from "./vietcapBoardSnapshotService";

const DEFAULT_GROUPS = ["VN30", "HNX30", "HOSE", "HNX", "UPCOM"];
const VIETCAP_GROUPS = (
    process.env.NEXT_PUBLIC_VIETCAP_STOCK_GROUPS ||
    DEFAULT_GROUPS.join(",")
)
    .split(",")
    .map((g) => g.trim().toUpperCase())
    .filter((g) => /^[A-Z0-9_]{1,24}$/.test(g));

const VIETCAP_SNAPSHOT_CACHE_TTL_MS = Number.parseInt(
    process.env.NEXT_PUBLIC_VIETCAP_SNAPSHOT_CACHE_TTL_MS || `${15 * 1000}`,
    10,
);
const STOCK_LAMBDA_URL = process.env.NEXT_PUBLIC_STOCK_LAMBDA_URL;

type SnapshotBundle = {
    bySymbol: Map<string, VietcapBoardSnapshotSymbolState>;
    groupsBySymbol: Map<string, Set<string>>;
};

let snapshotCache:
    | {
          expiresAt: number;
          value: SnapshotBundle;
      }
    | null = null;
let snapshotInflight: Promise<SnapshotBundle> | null = null;

function compactUsd(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return "-";
    if (value >= 1_000_000_000_000)
        return `${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (value >= 1_000_000_000)
        return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    return value.toFixed(0);
}

function normalizeSymbol(raw: string): string | null {
    const symbol = String(raw || "")
        .trim()
        .toUpperCase()
        .replace(/-(C|F)$/i, "");
    if (!symbol) return null;
    if (!/^[A-Z0-9]{1,12}$/.test(symbol)) return null;
    if (symbol.endsWith("USDT")) return null;
    return symbol;
}

function normalizeExchange(raw?: string): string | undefined {
    const source = String(raw || "").trim().toUpperCase();
    if (!source) return undefined;
    if (source === "HSX" || source === "HOSE") return "HOSE";
    return source;
}

function toIndexMembership(groups: Set<string>): string[] | undefined {
    const indexes = Array.from(groups).filter((g) =>
        ["VN30", "HNX30", "VNXALL", "VN100", "VNMID", "VNSML"].includes(g),
    );
    return indexes.length ? indexes : undefined;
}

function resolveStockLogoUrl(ticker: string): string {
    const configuredBase = STOCK_LAMBDA_URL?.trim() || "";
    const fallbackPath = `/stock/image/${encodeURIComponent(ticker)}`;
    if (!configuredBase) return fallbackPath;

    const normalizedBase = configuredBase.replace(/\/+$/, "");
    if (/^https?:\/\//i.test(normalizedBase)) {
        return `${normalizedBase}/image/${encodeURIComponent(ticker)}`;
    }
    if (normalizedBase.startsWith("/")) {
        return `${normalizedBase}/image/${encodeURIComponent(ticker)}`;
    }
    return fallbackPath;
}

function toAssetFromSnapshot(
    symbol: string,
    snapshot: VietcapBoardSnapshotSymbolState,
    groups: Set<string>,
    marketType: MarketType,
): Asset {
    const ref = Number.isFinite(snapshot.ref) ? snapshot.ref! : 0;
    const price = Number.isFinite(snapshot.price) ? snapshot.price! : ref;
    const change = price - ref;
    const changePercent = ref > 0 ? (change / ref) * 100 : 0;
    const totalVol = Number.isFinite(snapshot.totalVolumeTraded)
        ? snapshot.totalVolumeTraded!
        : Number.isFinite(snapshot.quantity)
          ? snapshot.quantity!
          : 0;
    const quoteVolume = totalVol * price;
    const exchange = normalizeExchange(snapshot.exchange);

    return {
        id: symbol,
        symbol,
        name: snapshot.companyName || symbol,
        logoUrl: resolveStockLogoUrl(symbol),
        price,
        change,
        changePercent,
        marketCap: "-",
        volume24h: compactUsd(quoteVolume),
        high24h: Number.isFinite(snapshot.highestPrice)
            ? snapshot.highestPrice!
            : price,
        low24h: Number.isFinite(snapshot.lowestPrice)
            ? snapshot.lowestPrice!
            : price,
        baseVolume: totalVol,
        quoteVolumeRaw: quoteVolume,
        sparkline: [ref, price].filter((v) => Number.isFinite(v)),
        marketType,
        stockProfile: {
            exchange,
            organName: snapshot.companyName,
            indexMembership: toIndexMembership(groups),
        },
    };
}

async function fetchMergedSnapshots(): Promise<SnapshotBundle> {
    const now = Date.now();
    if (snapshotCache && snapshotCache.expiresAt > now) {
        return snapshotCache.value;
    }
    if (snapshotInflight) return snapshotInflight;

    snapshotInflight = (async () => {
        const bySymbol = new Map<string, VietcapBoardSnapshotSymbolState>();
        const groupsBySymbol = new Map<string, Set<string>>();
        let hasSuccess = false;

        const settled = await Promise.allSettled(
            VIETCAP_GROUPS.map((group) =>
                vietcapBoardSnapshotService.getGroupSnapshot(group),
            ),
        );

        settled.forEach((result, idx) => {
            if (result.status !== "fulfilled") return;
            hasSuccess = true;
            const group = VIETCAP_GROUPS[idx];
            const payload = result.value.bySymbol;
            Object.entries(payload).forEach(([rawSymbol, row]) => {
                const symbol = normalizeSymbol(rawSymbol);
                if (!symbol) return;
                bySymbol.set(symbol, row);
                const set = groupsBySymbol.get(symbol) || new Set<string>();
                set.add(group);
                groupsBySymbol.set(symbol, set);
            });
        });

        if (!hasSuccess) {
            throw new Error("Vietcap snapshots unavailable for all groups");
        }

        const value = { bySymbol, groupsBySymbol };
        snapshotCache = {
            expiresAt: Date.now() + Math.max(5_000, VIETCAP_SNAPSHOT_CACHE_TTL_MS),
            value,
        };
        return value;
    })();

    try {
        return await snapshotInflight;
    } finally {
        snapshotInflight = null;
    }
}

export const vietcapStockService = {
    async getStockAssets(marketType: MarketType): Promise<Asset[]> {
        const bundle = await fetchMergedSnapshots();
        const out: Asset[] = [];
        bundle.bySymbol.forEach((row, symbol) => {
            out.push(
                toAssetFromSnapshot(
                    symbol,
                    row,
                    bundle.groupsBySymbol.get(symbol) || new Set<string>(),
                    marketType,
                ),
            );
        });
        out.sort((a, b) => b.quoteVolumeRaw - a.quoteVolumeRaw);
        return out;
    },

    async getBulkSnapshots(
        symbols: string[],
        marketType: MarketType,
    ): Promise<Map<string, Asset>> {
        const bundle = await fetchMergedSnapshots();
        const out = new Map<string, Asset>();
        symbols.forEach((raw) => {
            const symbol = normalizeSymbol(raw);
            if (!symbol) return;
            const row = bundle.bySymbol.get(symbol);
            if (!row) return;
            out.set(
                symbol,
                toAssetFromSnapshot(
                    symbol,
                    row,
                    bundle.groupsBySymbol.get(symbol) || new Set<string>(),
                    marketType,
                ),
            );
        });
        return out;
    },

    clearCache() {
        snapshotCache = null;
        snapshotInflight = null;
    },
};
