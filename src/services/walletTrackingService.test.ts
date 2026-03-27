import { describe, expect, it, vi } from "vitest";

import { trackWalletV1 } from "./walletTrackingService";

describe("walletTrackingService", () => {
    it("returns not_configured when provider config is missing", async () => {
        delete process.env.WALLET_TRACKING_PROVIDER_URL;
        delete process.env.WALLET_TRACKING_API_KEY;
        const out = await trackWalletV1({
            walletAddress: " 0xwallet ",
        });
        expect(out.status).toBe("not_configured");
        expect(out.walletAddress).toBe("0xwallet");
    });

    it("maps tracked response with pnl/portfolio/activity", async () => {
        process.env.WALLET_TRACKING_PROVIDER_URL =
            "https://provider/wallet/{walletAddress}";
        process.env.WALLET_TRACKING_API_KEY = "key";
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    statusMessage: "ok",
                    pnl: [{ symbol: "BTC", realizedPnlUsd: "12.5" }],
                    portfolio: [{ symbol: "ETH", allocationPct: 25 }],
                    recentActivity: [{ symbol: "SOL", event: "buy", at: "2026-03-27T00:00:00Z" }],
                }),
                { status: 200 },
            ),
        ) as typeof global.fetch;

        const out = await trackWalletV1({
            walletAddress: "0xwallet",
        });
        expect(out.status).toBe("tracked");
        expect(out.pnl?.[0].realizedPnlUsd).toBe(12.5);
        expect(out.portfolio?.[0].allocationPct).toBe(25);
        expect(out.recentActivity?.[0].event).toBe("buy");
        global.fetch = originalFetch;
    });

    it("returns error status when provider fails", async () => {
        process.env.WALLET_TRACKING_PROVIDER_URL =
            "https://provider/wallet/:walletAddress";
        process.env.WALLET_TRACKING_API_KEY = "key";
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () => new Response("bad", { status: 429 })) as typeof global.fetch;

        const out = await trackWalletV1({
            walletAddress: "0xwallet",
        });
        expect(out.status).toBe("error");
        expect(out.message).toContain("429");
        global.fetch = originalFetch;
    });
});
