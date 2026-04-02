import { useCallback, useEffect, useState } from "react";
import {
    vietcapMarketIndexService,
    type VietcapMarketIndexResult,
} from "../services/vietcapMarketIndexService";

type UseVietcapMarketIndexesOptions = {
    enabled?: boolean;
    refreshIntervalMs?: number;
};

type UseVietcapMarketIndexesResult = {
    bySymbol: VietcapMarketIndexResult["bySymbol"];
    fetchedAt: string | null;
    count: number;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

const DEFAULT_REFRESH_INTERVAL_MS = 45_000;

export function useVietcapMarketIndexes(
    options: UseVietcapMarketIndexesOptions = {},
): UseVietcapMarketIndexesResult {
    const { enabled = true, refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS } =
        options;
    const [bySymbol, setBySymbol] = useState<
        VietcapMarketIndexResult["bySymbol"]
    >({});
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);
    const [count, setCount] = useState(0);
    const [isLoading, setIsLoading] = useState(Boolean(enabled));
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!enabled) return;
        try {
            const out = await vietcapMarketIndexService.getMarketIndexes();
            setBySymbol(out.bySymbol);
            setFetchedAt(out.fetchedAt);
            setCount(out.count);
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to fetch Vietcap market indexes",
            );
        } finally {
            setIsLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) {
            setBySymbol({});
            setFetchedAt(null);
            setCount(0);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        void fetchData();
        const timer = window.setInterval(() => {
            void fetchData();
        }, Math.max(5_000, refreshIntervalMs));
        return () => window.clearInterval(timer);
    }, [enabled, fetchData, refreshIntervalMs]);

    return {
        bySymbol,
        fetchedAt,
        count,
        isLoading,
        error,
        refetch: fetchData,
    };
}

