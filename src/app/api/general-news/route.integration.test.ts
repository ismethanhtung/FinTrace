import { beforeEach, describe, expect, it, vi } from "vitest";

const parseURLMock = vi.fn();

vi.mock("rss-parser", () => ({
    default: class MockParser {
        parseURL = parseURLMock;
    },
}));

describe("GET /api/general-news", () => {
    beforeEach(() => {
        vi.resetModules();
        parseURLMock.mockReset();
    });

    it("returns articles from RSS and normalizes payload", async () => {
        parseURLMock.mockResolvedValue({
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
        parseURLMock.mockRejectedValue(new Error("rss fail"));
        const { GET } = await import("./route");
        const res = await GET(
            new Request("http://localhost/api/general-news?refresh=1"),
        );
        const body = await res.json();
        expect(res.status).toBe(500);
        expect(body.error).toContain("Failed to fetch news");
    });
});
