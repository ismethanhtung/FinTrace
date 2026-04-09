import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchRssFeedMock = vi.fn();

vi.mock("../../../lib/rss", () => ({
    fetchRssFeed: fetchRssFeedMock,
    readRssErrorLogFields: (error: unknown) => ({
        message: error instanceof Error ? error.message : String(error),
    }),
}));

describe("GET /api/news", () => {
    beforeEach(() => {
        vi.resetModules();
        fetchRssFeedMock.mockReset();
    });

    it("returns 400 when symbol is missing", async () => {
        const { GET } = await import("./route");
        const req = new Request("http://localhost/api/news");
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toContain("Missing symbol");
    });

    it("returns normalized rss items on success", async () => {
        fetchRssFeedMock.mockResolvedValue({
            title: "Google News",
            items: [
                {
                    guid: "1",
                    title: "BTC rises - Example",
                    link: "https://example.com/a",
                    contentSnippet: "<b>Hello</b> world",
                    isoDate: "2026-03-27T00:00:00.000Z",
                },
            ],
        });
        const { GET } = await import("./route");
        const req = new Request("http://localhost/api/news?symbol=BTCUSDT");
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.items).toHaveLength(1);
        expect(body.items[0].title).toBe("BTC rises");
        expect(body.items[0].description).toBe("Hello world");
        expect(fetchRssFeedMock).toHaveBeenCalledWith(
            "https://news.google.com/rss/search?q=BTC%20crypto&hl=en-US&gl=US&ceid=US:en",
        );
    });

    it("uses Vietnamese stock-focused query for stock universe", async () => {
        fetchRssFeedMock.mockResolvedValue({
            title: "Google News",
            items: [],
        });

        const { GET } = await import("./route");
        const req = new Request(
            "http://localhost/api/news?symbol=SSI&universe=stock",
        );
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.items).toEqual([]);
        expect(fetchRssFeedMock).toHaveBeenCalledWith(
            "https://news.google.com/rss/search?q=Ch%E1%BB%A9ng%20kho%C3%A1n%20SSI&hl=vi&gl=VN&ceid=VN:vi",
        );
    });
});
