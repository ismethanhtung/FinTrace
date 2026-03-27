import { beforeEach, describe, expect, it, vi } from "vitest";

describe("dataStreamWorker", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
    });

    it("handles INIT + EVENT and flushes STATE payload", async () => {
        const postMessage = vi.fn();
        const workerSelf: any = { postMessage, onmessage: undefined };
        vi.stubGlobal("self", workerSelf);

        await import("./dataStreamWorker");

        workerSelf.onmessage({
            data: {
                type: "INIT",
                config: {
                    minVolumeUsd: 1000,
                    highlightUsd: 50000,
                    showBuy: true,
                    showSell: true,
                    showFunding: true,
                    showHighlightOnly: false,
                    maxRecords: 100,
                },
            },
        });

        workerSelf.onmessage({
            data: {
                type: "EVENT",
                event: {
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
                },
            },
        });

        vi.advanceTimersByTime(200);

        expect(postMessage).toHaveBeenCalled();
        const state = postMessage.mock.calls.at(-1)?.[0];
        expect(state.type).toBe("STATE");
        expect(state.records.length).toBeGreaterThan(0);
        expect(state.records[0].action).toBe("HIGHLIGHT");
        expect(state.highlightSeq).toBe(1);
    });

    it("filters non-highlight records when enabling highlight-only mode", async () => {
        const postMessage = vi.fn();
        const workerSelf: any = { postMessage, onmessage: undefined };
        vi.stubGlobal("self", workerSelf);

        await import("./dataStreamWorker");

        const baseConfig = {
            minVolumeUsd: 1000,
            highlightUsd: 50000,
            showBuy: true,
            showSell: true,
            showFunding: true,
            showHighlightOnly: false,
            maxRecords: 100,
        };

        workerSelf.onmessage({ data: { type: "INIT", config: baseConfig } });
        workerSelf.onmessage({
            data: {
                type: "EVENT",
                event: {
                    kind: "trade",
                    marketType: "spot",
                    pair: "ETHUSDT",
                    token: "ETH",
                    side: "sell",
                    usdValue: 2000,
                    price: 2000,
                    qty: 1,
                    eventTimeMs: Date.now(),
                    source: "Binance Spot",
                },
            },
        });
        workerSelf.onmessage({
            data: { type: "CONFIG", config: { ...baseConfig, showHighlightOnly: true } },
        });

        vi.advanceTimersByTime(200);

        const state = postMessage.mock.calls.at(-1)?.[0];
        expect(state.records.every((r: any) => r.action === "HIGHLIGHT")).toBe(
            true,
        );
    });
});
