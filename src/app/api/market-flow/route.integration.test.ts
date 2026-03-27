import { beforeEach, describe, expect, it, vi } from "vitest";

describe("GET /api/market-flow", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("returns buckets and futures fields on success", async () => {
        global.fetch = vi.fn(async (input: URL | RequestInfo) => {
            const url = String(input);
            if (url.includes("/klines")) {
                return new Response(JSON.stringify([[0, "", "", "", "", "10", "", "", "", "4"]]), {
                    status: 200,
                });
            }
            if (url.includes("/aggTrades")) {
                return new Response(
                    JSON.stringify([
                        { q: "2", p: "6000", m: false, T: Date.now() - 1000 },
                        { q: "1", p: "500", m: true, T: Date.now() },
                    ]),
                    { status: 200 },
                );
            }
            return new Response(JSON.stringify([{ timestamp: Date.now() }]), { status: 200 });
        }) as typeof global.fetch;

        const { GET } = await import("./route");
        const req = {
            nextUrl: new URL("http://localhost/api/market-flow?symbol=BTCUSDT&period=1d&limit=30"),
        };
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.symbol).toBe("BTCUSDT");
        expect(body.buckets).toBeTruthy();
        expect(body.longShortRatio).toBeTruthy();
        expect(body.takerFlow).toBeTruthy();
        expect(body.openInterest).toBeTruthy();
    });

    it("falls back to medium bucket when aggTrades fails", async () => {
        global.fetch = vi.fn(async (input: URL | RequestInfo) => {
            const url = String(input);
            if (url.includes("/klines")) {
                return new Response(JSON.stringify([[0, "", "", "", "", "8", "", "", "", "3"]]), {
                    status: 200,
                });
            }
            if (url.includes("/aggTrades")) {
                return new Response("bad", { status: 500 });
            }
            return new Response(JSON.stringify([{ ok: true }]), { status: 200 });
        }) as typeof global.fetch;

        const { GET } = await import("./route");
        const req = {
            nextUrl: new URL("http://localhost/api/market-flow?symbol=ETHUSDT&period=1h&limit=24"),
        };
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.buckets.medium.buy).toBeGreaterThan(0);
        expect(body.buckets.large.buy).toBe(0);
    });
});
