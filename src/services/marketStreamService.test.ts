import { describe, expect, it } from "vitest";
import {
    applyOrderBookDiff,
    createOrderBookState,
    deriveOrderBookData,
    mergeMiniTickerArray,
    normalizeKlineStreamEvent,
    normalizeMarkPriceStreamEvent,
    normalizeTradeStreamEvent,
} from "./marketStreamService";

describe("marketStreamService", () => {
    it("merges mini ticker updates into existing assets", () => {
        const next = mergeMiniTickerArray(
            [
                {
                    id: "BTCUSDT",
                    symbol: "BTC",
                    name: "BTC",
                    price: 1,
                    change: 0,
                    changePercent: 0,
                    marketCap: "-",
                    volume24h: "-",
                    high24h: 0,
                    low24h: 0,
                    baseVolume: 0,
                    quoteVolumeRaw: 10,
                    sparkline: [],
                    marketType: "spot",
                },
            ],
            [
                {
                    s: "BTCUSDT",
                    o: "100",
                    c: "120",
                    h: "125",
                    l: "99",
                    v: "10",
                    q: "1200",
                },
            ],
            "spot",
        );

        expect(next[0].price).toBe(120);
        expect(next[0].changePercent).toBe(20);
        expect(next[0].quoteVolumeRaw).toBe(1200);
    });

    it("normalizes trade, kline, and mark price stream payloads", () => {
        expect(
            normalizeTradeStreamEvent({
                e: "trade",
                s: "BTCUSDT",
                p: "10",
                q: "2",
                T: 1000,
                m: false,
            }),
        ).toMatchObject({ price: 10, qty: 2, isBuy: true });

        expect(
            normalizeKlineStreamEvent({
                e: "kline",
                s: "BTCUSDT",
                k: {
                    t: 1000,
                    T: 1999,
                    s: "BTCUSDT",
                    i: "1m",
                    o: "10",
                    h: "11",
                    l: "9",
                    c: "10.5",
                    v: "100",
                    x: true,
                },
            }),
        ).toMatchObject({ timestamp: 1000, close: 10.5, volume: 100 });

        expect(
            normalizeMarkPriceStreamEvent({
                e: "markPriceUpdate",
                s: "BTCUSDT",
                p: "101",
                i: "100.5",
                r: "0.0001",
                T: 9999,
                E: 8888,
            }),
        ).toMatchObject({
            symbol: "BTCUSDT",
            markPrice: 101,
            indexPrice: 100.5,
        });
    });

    it("applies order book diffs and detects sequence gaps", () => {
        const state = createOrderBookState({
            lastUpdateId: 10,
            bids: [["100", "1"], ["99", "2"]],
            asks: [["101", "3"], ["102", "4"]],
        });

        const next = applyOrderBookDiff(state, {
            U: 11,
            u: 12,
            b: [["100", "5"]],
            a: [["101", "1"]],
        });

        expect(next?.lastUpdateId).toBe(12);
        expect(next?.bids.get("100")).toBe(5);
        expect(next?.asks.get("101")).toBe(1);

        const gap = applyOrderBookDiff(state, {
            U: 20,
            u: 21,
            b: [["100", "7"]],
        });
        expect(gap).toBeNull();
    });

    it("derives grouped order book data from state", () => {
        const state = createOrderBookState({
            lastUpdateId: 10,
            bids: [["100", "1"], ["99", "2"]],
            asks: [["101", "3"], ["102", "4"]],
        });
        const data = deriveOrderBookData(state, 1);

        expect(data?.spread).toBe(1);
        expect(data?.bids[0].price).toBe(100);
        expect(data?.asks[0].price).toBe(101);
    });
});

