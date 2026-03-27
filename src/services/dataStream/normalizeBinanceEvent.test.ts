import { describe, expect, it } from "vitest";

import {
    normalizeBinanceEvent,
    normalizeBinanceFuturesForceOrderEvent,
    normalizeBinanceFuturesMarkPriceEvent,
    normalizeBinanceFuturesTradeEvent,
    normalizeBinanceSpotTradeEvent,
} from "./normalizeBinanceEvent";

describe("normalizeBinanceEvent", () => {
    it("normalizes spot trade payload", () => {
        const out = normalizeBinanceSpotTradeEvent(
            { e: "trade", s: "BTCUSDT", T: 1000, t: 1, p: "100", q: "2", m: false },
            "BTCUSDT",
        );
        expect(out).not.toBeNull();
        expect(out?.marketType).toBe("spot");
        expect(out?.side).toBe("buy");
        expect(out?.usdValue).toBe(200);
        expect(out?.token).toBe("BTC");
    });

    it("normalizes futures trade payload and handles buyer maker side", () => {
        const out = normalizeBinanceFuturesTradeEvent(
            { e: "trade", s: "ETHUSDT", T: "2000", t: 2, p: "10", q: "5", m: true },
            "ETHUSDT",
        );
        expect(out).not.toBeNull();
        expect(out?.marketType).toBe("futures");
        expect(out?.side).toBe("sell");
        expect(out?.eventTimeMs).toBe(2000);
    });

    it("normalizes futures mark price event", () => {
        const out = normalizeBinanceFuturesMarkPriceEvent(
            { s: "BTCUSDT", r: "0.001", T: 12345, p: "45000", i: "44900", E: 12000 },
            "BTCUSDT",
        );
        expect(out).not.toBeNull();
        expect(out?.kind).toBe("funding");
        expect(out?.fundingRateDecimal).toBe(0.001);
        expect(out?.markPrice).toBe(45000);
    });

    it("normalizes futures liquidation force order event", () => {
        const out = normalizeBinanceFuturesForceOrderEvent(
            {
                e: "forceOrder",
                E: 1712000000000,
                o: {
                    s: "BTCUSDT",
                    S: "SELL",
                    o: "LIMIT",
                    q: "0.75",
                    p: "61234.5",
                    ap: "61230.0",
                    X: "FILLED",
                    l: "0.75",
                    z: "0.75",
                    T: 1712000000123,
                },
            },
            "BTCUSDT",
        );
        expect(out).not.toBeNull();
        expect(out?.kind).toBe("liquidation");
        expect(out?.side).toBe("sell");
        expect(out?.orderType).toBe("LIMIT");
        expect(out?.price).toBe(61234.5);
        expect(out?.qty).toBe(0.75);
        expect(out?.usdValue).toBe(45925.875);
    });

    it("returns null for invalid payloads", () => {
        expect(normalizeBinanceSpotTradeEvent(null, "BTCUSDT")).toBeNull();
        expect(normalizeBinanceFuturesTradeEvent({ e: "trade", s: "BTCUSDT" }, "BTCUSDT")).toBeNull();
        expect(normalizeBinanceFuturesMarkPriceEvent({ s: "BTCUSDT", r: "x", T: 1 }, "BTCUSDT")).toBeNull();
    });

    it("routes by market type in normalizeBinanceEvent", () => {
        const funding = normalizeBinanceEvent(
            { s: "BTCUSDT", r: "0.001", T: 123, E: 99 },
            "BTCUSDT",
            "futures",
        );
        const liquidation = normalizeBinanceEvent(
            {
                e: "forceOrder",
                E: 123,
                o: { S: "BUY", o: "LIMIT", q: "1", p: "100", T: 120 },
            },
            "BTCUSDT",
            "futures",
        );
        const spot = normalizeBinanceEvent(
            { e: "trade", s: "BTCUSDT", T: 1, p: "1", q: "1" },
            "BTCUSDT",
            "spot",
        );
        expect(funding?.kind).toBe("funding");
        expect(liquidation?.kind).toBe("liquidation");
        expect(spot?.kind).toBe("trade");
    });
});
