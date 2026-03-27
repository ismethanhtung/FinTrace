import { describe, expect, it, vi } from "vitest";

import { newsService } from "./newsService";

describe("newsService", () => {
    it("maps successful API response", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    items: [
                        {
                            id: "1",
                            title: "BTC up",
                            url: "https://example",
                            source: "News",
                            publishedAt: "2026-03-27T00:00:00.000Z",
                            description: "desc",
                        },
                    ],
                }),
                { status: 200 },
            ),
        ) as typeof global.fetch;

        const out = await newsService.getNews("BTCUSDT", undefined, 5);
        expect(out).toHaveLength(1);
        expect(out[0].currencies).toEqual(["BTC"]);
        global.fetch = originalFetch;
    });

    it("falls back to mock data when API fails", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () => new Response("", { status: 500 })) as typeof global.fetch;
        const out = await newsService.getNews("ETHUSDT");
        expect(out.length).toBeGreaterThan(0);
        expect(out[0].title).toContain("ETH");
        global.fetch = originalFetch;
    });

    it("returns mock data when API items are empty", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 })) as typeof global.fetch;
        const out = await newsService.getNews("SOLUSDT");
        expect(out.length).toBe(3);
        global.fetch = originalFetch;
    });
});
