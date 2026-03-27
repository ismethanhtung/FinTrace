// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMarketFlow } from "./useMarketFlow";

describe("useMarketFlow", () => {
    it("loads data from API and supports refetch", async () => {
        const fetchMock = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    symbol: "BTCUSDT",
                    buckets: {
                        large: { buy: 1, sell: 2 },
                        medium: { buy: 3, sell: 4 },
                        small: { buy: 5, sell: 6 },
                    },
                    longShortRatio: null,
                    takerFlow: null,
                    openInterest: null,
                }),
                { status: 200 },
            ),
        );
        global.fetch = fetchMock as typeof global.fetch;

        const { result } = renderHook(() => useMarketFlow("BTCUSDT", "1d"));
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.data?.symbol).toBe("BTCUSDT");

        await act(async () => {
            await result.current.refetch();
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("sets error when API returns failure", async () => {
        global.fetch = vi.fn(async () => new Response("x", { status: 500 })) as typeof global.fetch;
        const { result } = renderHook(() => useMarketFlow("ETHUSDT", "1h"));
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toContain("API Error: 500");
    });
});
