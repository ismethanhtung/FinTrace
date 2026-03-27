import { beforeEach, describe, expect, it, vi } from "vitest";

describe("GET /api/market/network-map", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("returns mapped payload on successful upstream fetches", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("/coins/markets")) {
                return new Response(
                    JSON.stringify([{ id: "bitcoin", symbol: "btc" }]),
                    { status: 200 },
                );
            }
            return new Response(
                JSON.stringify([
                    {
                        id: "bitcoin",
                        symbol: "btc",
                        platforms: { ethereum: "0x1" },
                    },
                ]),
                { status: 200 },
            );
        }) as typeof global.fetch;

        const { GET } = await import("./route");
        const res = await GET();
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.bySymbol.BTC).toEqual(["ethereum"]);
        expect(body.bySymbolPrimary.BTC).toBe("ethereum");
        global.fetch = originalFetch;
    });

    it("returns graceful fallback payload when upstream fails", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () => {
            throw new Error("upstream down");
        }) as typeof global.fetch;

        const { GET } = await import("./route");
        const res = await GET();
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.bySymbol).toBeDefined();
        expect(body.bySymbolPrimary).toBeDefined();
        global.fetch = originalFetch;
    });
});
