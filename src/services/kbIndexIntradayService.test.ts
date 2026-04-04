import { afterEach, describe, expect, it, vi } from "vitest";

import { kbIndexIntradayService } from "./kbIndexIntradayService";

describe("kbIndexIntradayService", () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("falls back across weekend days until it finds non-empty rows", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-04-05T10:00:00+07:00"));

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        sourceSymbol: "VNINDEX",
                        rows: [],
                    }),
                    { status: 200 },
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        sourceSymbol: "VNINDEX",
                        rows: [],
                    }),
                    { status: 200 },
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        sourceSymbol: "VNINDEX",
                        rows: [
                            {
                                t: "2026-04-03 10:00:00",
                                c: 1295.25,
                                v: 12345,
                            },
                        ],
                    }),
                    { status: 200 },
                ),
            );
        global.fetch = fetchMock as typeof global.fetch;

        const out = await kbIndexIntradayService.getSeries("VNINDEX");
        const calls = fetchMock.mock.calls as unknown[][];

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(String(calls[0]?.[0])).toContain("date=05-04-2026");
        expect(String(calls[1]?.[0])).toContain("date=04-04-2026");
        expect(String(calls[2]?.[0])).toContain("date=03-04-2026");
        expect(out.points).toHaveLength(1);
    });

    it("uses explicit date without lookback retries", async () => {
        const fetchMock = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    sourceSymbol: "VNINDEX",
                    rows: [],
                }),
                { status: 200 },
            ),
        );
        global.fetch = fetchMock as typeof global.fetch;

        await kbIndexIntradayService.getSeries("VNINDEX", new Date("2026-04-02T10:00:00+07:00"));
        const calls = fetchMock.mock.calls as unknown[][];

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(calls[0]?.[0])).toContain("date=02-04-2026");
    });
});
