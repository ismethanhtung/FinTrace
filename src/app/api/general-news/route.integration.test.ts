import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchRssFeedMock = vi.fn();

vi.mock("../../../lib/rss", () => ({
    fetchRssFeed: fetchRssFeedMock,
    readRssErrorLogFields: (error: unknown) => ({
        message: error instanceof Error ? error.message : String(error),
    }),
}));

describe("GET /api/general-news", () => {
    beforeEach(() => {
        vi.resetModules();
        fetchRssFeedMock.mockReset();
    });

    it("returns articles from RSS and normalizes payload", async () => {
        fetchRssFeedMock.mockResolvedValue({
            title: "Feed",
            items: [
                {
                    guid: "1",
                    title: "Crypto rally - Site",
                    link: "https://example.com/1",
                    contentSnippet: "<p>Market up</p>",
                    isoDate: "2026-03-27T00:00:00.000Z",
                },
            ],
        });
        const { GET } = await import("./route");
        const res = await GET(new Request("http://localhost/api/general-news"));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.articles).toHaveLength(1);
        expect(body.articles[0].title).toBe("Crypto rally");
    });

    it("returns 500 with error contract when fetch fails and cache is empty", async () => {
        fetchRssFeedMock.mockRejectedValue(new Error("rss fail"));
        const { GET } = await import("./route");
        const res = await GET(
            new Request("http://localhost/api/general-news?refresh=1"),
        );
        const body = await res.json();
        expect(res.status).toBe(500);
        expect(body.error).toContain("Failed to fetch news");
    });

    it("uses Vietnamese stock queries when universe=stock", async () => {
        fetchRssFeedMock.mockResolvedValue({
            title: "Feed",
            items: [
                {
                    guid: "1",
                    title: "VNINDEX tăng - Site",
                    link: "https://example.com/stock-1",
                    contentSnippet: "<p>Stock up</p>",
                    isoDate: "2026-03-27T00:00:00.000Z",
                },
            ],
        });

        const { GET } = await import("./route");
        const res = await GET(
            new Request("http://localhost/api/general-news?universe=stock"),
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.articles).toHaveLength(1);
        expect(fetchRssFeedMock).toHaveBeenCalled();
        expect(fetchRssFeedMock.mock.calls[0][0]).toContain(
            "q=ch%E1%BB%A9ng%20kho%C3%A1n",
        );
        expect(fetchRssFeedMock.mock.calls[0][0]).toContain("hl=vi");
        expect(fetchRssFeedMock.mock.calls[0][0]).toContain("gl=VN");
        expect(fetchRssFeedMock.mock.calls[0][0]).toContain("ceid=VN:vi");
    });
});
