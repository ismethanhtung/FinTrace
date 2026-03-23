import { useState, useEffect, useCallback, useRef } from "react";

export interface Bucket {
    buy: number;
    sell: number;
}

export interface MarketFlowData {
    symbol: string;
    buckets: {
        large: Bucket;
        medium: Bucket;
        small: Bucket;
    } | null;
    longShortRatio: Array<{
        symbol: string;
        longAccount: string;
        longShortRatio: string;
        shortAccount: string;
        timestamp: number;
    }> | null;
    takerFlow: Array<{
        buySellRatio: string;
        buyVol: string;
        sellVol: string;
        timestamp: number;
    }> | null;
    openInterest: Array<{
        symbol: string;
        sumOpenInterest: string;
        sumOpenInterestValue: string;
        timestamp: number;
    }> | null;
}

const PERIODS = ["15m", "30m", "1h", "2h", "4h", "1d"] as const;
export type FlowPeriod = (typeof PERIODS)[number];
export { PERIODS };

const PERIOD_LIMITS: Record<FlowPeriod, string> = {
    "15m": "96",
    "30m": "48",
    "1h": "24",
    "2h": "12",
    "4h": "6",
    "1d": "30",
};

export const useMarketFlow = (symbol: string, period: FlowPeriod = "1d") => {
    const [data, setData] = useState<MarketFlowData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/market-flow?symbol=${encodeURIComponent(symbol)}&period=${period}&limit=${PERIOD_LIMITS[period]}`,
                { signal: abortRef.current.signal },
            );
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setData(json);
        } catch (err: any) {
            if (err.name !== "AbortError")
                setError(err.message || "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, [symbol, period]);

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const tick = async () => {
            if (cancelled) return;
            await fetchData();
            if (cancelled) return;
            timer = setTimeout(tick, 60_000);
        };

        tick();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
            abortRef.current?.abort();
        };
    }, [fetchData]);

    return { data, isLoading, error, refetch: fetchData };
};
