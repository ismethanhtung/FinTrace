// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMarketNews } from "./useMarketNews";

describe("useMarketNews", () => {
    it("loads articles from API", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    articles: [{ id: "1", shortTitle: "x" }],
                    cachedAt: "2026-03-27T00:00:00.000Z",
                }),
                { status: 200 },
            ),
        ) as typeof global.fetch;

        const { result } = renderHook(() => useMarketNews());
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        expect(result.current.articles).toHaveLength(1);
        expect(result.current.cachedAt).toBeTruthy();
        global.fetch = originalFetch;
    });

    it("sets error when API fails", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () => new Response("x", { status: 500 })) as typeof global.fetch;

        const { result } = renderHook(() => useMarketNews());
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        expect(result.current.error).toBeTruthy();
        global.fetch = originalFetch;
    });
});
