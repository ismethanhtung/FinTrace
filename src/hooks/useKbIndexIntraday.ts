import { useCallback, useEffect, useMemo, useState } from "react";
import {
    KB_UI_INDEX_SYMBOLS,
    type KbIntradayPoint,
    type KbUiIndexSymbol,
} from "../lib/kb/indexIntraday";
import { kbIndexIntradayService } from "../services/kbIndexIntradayService";

type UseKbIndexIntradayOptions = {
    enabled?: boolean;
    refreshIntervalMs?: number;
    symbols?: KbUiIndexSymbol[];
};

type UseKbIndexIntradayResult = {
    bySymbol: Record<KbUiIndexSymbol, KbIntradayPoint[]>;
    sourceBySymbol: Partial<Record<KbUiIndexSymbol, string>>;
    isLoading: boolean;
    error: string | null;
    fetchedAt: string | null;
    refetch: () => Promise<void>;
};

const DEFAULT_REFRESH_INTERVAL_MS = 30_000;

const EMPTY_BY_SYMBOL: Record<KbUiIndexSymbol, KbIntradayPoint[]> = {
    VNINDEX: [],
    VN30: [],
    HNX30: [],
    HNXINDEX: [],
    UPCOM: [],
};

export function useKbIndexIntraday(
    options: UseKbIndexIntradayOptions = {},
): UseKbIndexIntradayResult {
    const {
        enabled = true,
        refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
        symbols,
    } = options;

    const activeSymbols = useMemo(
        () =>
            symbols && symbols.length
                ? Array.from(new Set(symbols))
                : [...KB_UI_INDEX_SYMBOLS],
        [symbols],
    );

    const [bySymbol, setBySymbol] = useState<Record<KbUiIndexSymbol, KbIntradayPoint[]>>(
        EMPTY_BY_SYMBOL,
    );
    const [sourceBySymbol, setSourceBySymbol] = useState<
        Partial<Record<KbUiIndexSymbol, string>>
    >({});
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(Boolean(enabled));
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!enabled) return;

        const results = await Promise.allSettled(
            activeSymbols.map((symbol) => kbIndexIntradayService.getSeries(symbol)),
        );

        let nextError: string | null = null;
        let hasAnySuccess = false;

        setBySymbol((prev) => {
            const next = { ...prev };
            results.forEach((result, index) => {
                const symbol = activeSymbols[index];
                if (result.status === "fulfilled") {
                    next[symbol] = result.value.points;
                    hasAnySuccess = true;
                } else if (!nextError) {
                    nextError = result.reason instanceof Error
                        ? result.reason.message
                        : `Failed to fetch ${symbol}`;
                }
            });
            return next;
        });

        setSourceBySymbol((prev) => {
            const next = { ...prev };
            results.forEach((result, index) => {
                const symbol = activeSymbols[index];
                if (result.status === "fulfilled") {
                    next[symbol] = result.value.sourceSymbol;
                }
            });
            return next;
        });

        setError(hasAnySuccess ? null : nextError || "Failed to fetch KB intraday");
        setFetchedAt(new Date().toISOString());
        setIsLoading(false);
    }, [activeSymbols, enabled]);

    useEffect(() => {
        if (!enabled) {
            setBySymbol(EMPTY_BY_SYMBOL);
            setSourceBySymbol({});
            setFetchedAt(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        void fetchData();
        const timer = window.setInterval(() => {
            void fetchData();
        }, Math.max(10_000, refreshIntervalMs));
        return () => window.clearInterval(timer);
    }, [enabled, fetchData, refreshIntervalMs]);

    return {
        bySymbol,
        sourceBySymbol,
        isLoading,
        error,
        fetchedAt,
        refetch: fetchData,
    };
}
