import { beforeEach, describe, expect, it } from "vitest";
import { DataStreamEngine } from "./dataStreamEngine";

describe("DataStreamEngine", () => {
    beforeEach(() => {
        // no fake timers needed — flush() is explicit
    });

    it("handles init + trade event and flush returns STATE", () => {
        const engine = new DataStreamEngine();
        engine.init({
            minVolumeUsd: 1000,
            highlightUsd: 50000,
            showBuy: true,
            showSell: true,
            showFunding: true,
            showHighlightOnly: false,
            maxRecords: 100,
        });

        engine.pushEvent({
            kind: "trade",
            marketType: "spot",
            pair: "BTCUSDT",
            token: "BTC",
            side: "buy",
            usdValue: 60000,
            price: 60000,
            qty: 1,
            tradeId: "1",
            eventTimeMs: Date.now(),
            source: "Binance Spot",
        });

        const state = engine.flush();
        expect(state).not.toBeNull();
        expect(state!.type).toBe("STATE");
        expect(state!.records.length).toBeGreaterThan(0);
        expect(state!.records[0].action).toBe("HIGHLIGHT");
        expect(state!.highlightSeq).toBe(1);
    });

    it("filters non-highlight records when enabling highlight-only mode", () => {
        const engine = new DataStreamEngine();
        const baseConfig = {
            minVolumeUsd: 1000,
            highlightUsd: 50000,
            showBuy: true,
            showSell: true,
            showFunding: true,
            showHighlightOnly: false,
            maxRecords: 100,
        };
        engine.init(baseConfig);

        engine.pushEvent({
            kind: "trade",
            marketType: "spot",
            pair: "ETHUSDT",
            token: "ETH",
            side: "sell",
            usdValue: 2000,
            price: 2000,
            qty: 1,
            tradeId: "2",
            eventTimeMs: Date.now(),
            source: "Binance Spot",
        });
        engine.flush();

        engine.setConfig({ ...baseConfig, showHighlightOnly: true });
        const state = engine.flush();
        expect(state).not.toBeNull();
        expect(state!.records.every((r) => r.action === "HIGHLIGHT")).toBe(
            true,
        );
    });
});
