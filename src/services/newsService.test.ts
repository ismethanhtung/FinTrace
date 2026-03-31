import { describe, expect, it, vi } from "vitest";

import { newsService } from "./newsService";

describe("newsService", () => {
    it("maps successful API response", async () => {
        const originalFetch = global.fetch;
        const fetchMock = vi.fn(async () =>
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
        );
        global.fetch = fetchMock as typeof global.fetch;

        const out = await newsService.getNews("BTCUSDT", undefined, 5, "coin");
        expect(out).toHaveLength(1);
        expect(out[0].currencies).toEqual(["BTC"]);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/news?symbol=BTCUSDT&universe=coin",
        );
        global.fetch = originalFetch;
    });

    it("sends stock universe to API query", async () => {
        const originalFetch = global.fetch;
        const fetchMock = vi.fn(async () =>
            new Response(JSON.stringify({ items: [] }), { status: 200 }),
        );
        global.fetch = fetchMock as typeof global.fetch;

        await newsService.getNews("SSI", undefined, 10, "stock");
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/news?symbol=SSI&universe=stock",
        );
        global.fetch = originalFetch;
    });

    it("throws when API fails", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () => new Response("", { status: 500 })) as typeof global.fetch;
        await expect(newsService.getNews("ETHUSDT")).rejects.toThrow(
            "News API Error: 500",
        );
        global.fetch = originalFetch;
    });

    it("returns empty array when API items are empty", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 })) as typeof global.fetch;
        const out = await newsService.getNews("SOLUSDT");
        expect(out).toEqual([]);
        global.fetch = originalFetch;
    });
});
