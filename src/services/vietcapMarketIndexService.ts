import {
    mapVietcapMarketIndexBySymbol,
    type VietcapMarketIndexState,
} from "../lib/vietcap/marketIndex";

type VietcapMarketIndexApiResponse = {
    fetchedAt?: string;
    rows?: unknown;
    error?: string;
};

export type VietcapMarketIndexResult = {
    fetchedAt: string | null;
    bySymbol: Record<string, VietcapMarketIndexState>;
    count: number;
};

export const vietcapMarketIndexService = {
    async getMarketIndexes(): Promise<VietcapMarketIndexResult> {
        const res = await fetch("/api/board/vietcap-market-index", {
            method: "GET",
            cache: "no-store",
        });
        const payload = (await res.json()) as VietcapMarketIndexApiResponse;
        if (!res.ok) {
            throw new Error(
                payload?.error || `Vietcap market index API error: ${res.status}`,
            );
        }
        const bySymbol = mapVietcapMarketIndexBySymbol(payload.rows);
        return {
            fetchedAt:
                typeof payload.fetchedAt === "string" ? payload.fetchedAt : null,
            bySymbol,
            count: Object.keys(bySymbol).length,
        };
    },
};

