import { beforeEach, describe, expect, it, vi } from "vitest";

const parseURLMock = vi.fn();

vi.mock("rss-parser", () => {
    return {
        default: class MockParser {
            parseURL = parseURLMock;
        },
    };
});

describe("GET /api/news", () => {
    beforeEach(() => {
        parseURLMock.mockReset();
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
        parseURLMock.mockResolvedValue({
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
    });
});
