// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

let currentUniverse: "stock" | "coin" = "stock";

vi.mock("../context/UniverseContext", () => ({
    useUniverse: vi.fn(() => ({ universe: currentUniverse })),
}));

vi.mock("../services/marketStreamService", () => ({
    subscribeSharedStream: vi.fn(() => ({
        unsubscribe: vi.fn(),
    })),
    normalizeKlineStreamEvent: vi.fn(() => null),
}));

vi.mock("../services/stockLambdaService", () => ({
    stockLambdaService: {
        isConfigured: vi.fn(() => true),
        getStockChart: vi.fn(),
    },
}));

vi.mock("../services/binanceService", () => ({
    INTERVAL_MAP: {
        "1m": "1m",
        "5m": "5m",
        "15m": "15m",
        "1H": "1h",
        "4H": "4h",
        "1D": "1d",
        "1W": "1w",
        "1M": "1M",
    },
    binanceService: {
        getKlines: vi.fn(),
        getFuturesKlines: vi.fn(),
        mapKline: vi.fn((k: any[]) => ({
            timestamp: k[0],
            time: "",
            open: Number(k[1]),
            high: Number(k[2]),
            low: Number(k[3]),
            close: Number(k[4]),
            volume: Number(k[5]),
        })),
    },
}));

import { useChartData } from "./useChartData";
import { stockLambdaService } from "../services/stockLambdaService";
import { binanceService } from "../services/binanceService";

describe("useChartData", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentUniverse = "stock";
    });

    it("ignores stale stock response after switching to coin", async () => {
        const stockReq = deferred<any[]>();
        const coinReqA = deferred<any[]>();
        const coinReqB = deferred<any[]>();
        const coinQueue = [coinReqA, coinReqB];

        vi.mocked(stockLambdaService.getStockChart).mockReturnValue(
            stockReq.promise as Promise<any>,
        );
        vi.mocked(binanceService.getKlines).mockImplementation(
            () => (coinQueue.shift()?.promise as Promise<any>) ?? Promise.resolve([]),
        );

        const { result, rerender } = renderHook(() =>
            useChartData("SSI", "spot"),
        );

        await waitFor(() => {
            expect(stockLambdaService.getStockChart).toHaveBeenCalled();
        });

        currentUniverse = "coin";
        rerender();

        const coinPayload = [[1000, "65000", "65100", "64900", "65050", "10"]];
        coinReqA.resolve(coinPayload);
        coinReqB.resolve(coinPayload);

        await waitFor(() => {
            expect(result.current.data.length).toBeGreaterThan(0);
        });
        expect(result.current.data.at(-1)?.close).toBe(65050);

        // Old stock request resolves late and must not overwrite BTC chart.
        stockReq.resolve([
            {
                timestamp: 900,
                open: 120000,
                high: 121000,
                low: 119000,
                close: 120500,
                volume: 1000,
                time: "",
            },
        ]);

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        expect(result.current.data.at(-1)?.close).toBe(65050);
    });
});

