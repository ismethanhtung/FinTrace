import { describe, expect, it } from "vitest";

import { __stockLambdaParserForTest } from "./stockLambdaService";

describe("stockLambdaService parsers", () => {
    it("parses price_depth payload with Vietnamese keys", () => {
        const payload = [
            {
                Ma: "FPT",
                "Giá mua 1": "112000",
                "KL mua 1": "12000",
                "Giá mua 2": "111900",
                "KL mua 2": "5400",
                "Giá bán 1": "112100",
                "KL bán 1": "9800",
                "Giá bán 2": "112200",
                "KL bán 2": "7300",
                "Giá khớp lệnh": "112000",
                "KL Khớp lệnh": "2500",
            },
        ];

        const snapshot = __stockLambdaParserForTest.parseStockDepthPayload(
            payload,
            "FPT",
        );

        expect(snapshot).not.toBeNull();
        expect(snapshot?.symbol).toBe("FPT");
        expect(snapshot?.bids[0]).toEqual({ price: 112000, quantity: 12000 });
        expect(snapshot?.asks[0]).toEqual({ price: 112100, quantity: 9800 });
        expect(snapshot?.matchedPrice).toBe(112000);
        expect(snapshot?.matchedVolume).toBe(2500);
    });

    it("parses intraday payload and returns trades sorted by time desc", () => {
        const payload = [
            {
                id: 101,
                time: "2026-04-03T09:00:01.000Z",
                price: 112000,
                volume: 800,
                matchedBy: "B",
            },
            {
                id: 102,
                time: "2026-04-03T09:00:02.000Z",
                price: 111900,
                volume: 600,
                matchedBy: "S",
            },
        ];

        const trades = __stockLambdaParserForTest.parseStockIntradayTrades(
            payload,
            20,
        );

        expect(trades).toHaveLength(2);
        expect(trades[0].id).toBe(102);
        expect(trades[0].isBuy).toBe(false);
        expect(trades[1].id).toBe(101);
        expect(trades[1].isBuy).toBe(true);
    });

    it("normalizes intraday price from thousand-VND unit", () => {
        const payload = [
            {
                id: 201,
                time: "2026-04-03T09:01:01.000Z",
                price: 27.55,
                volume: 1000,
                matchedBy: "B",
            },
        ];

        const trades = __stockLambdaParserForTest.parseStockIntradayTrades(
            payload,
            20,
        );
        expect(trades).toHaveLength(1);
        expect(trades[0].price).toBeCloseTo(27550, 4);
    });
});
