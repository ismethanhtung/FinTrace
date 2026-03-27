// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../context/AppSettingsContext", () => ({
    useAppSettings: vi.fn(() => ({
        activeProviderId: "openrouter",
        selectedModel: "m",
    })),
}));

import { useQueryEngine } from "./useQueryEngine";

describe("useQueryEngine", () => {
    it("runs NLQ and search then exposes spec/result", async () => {
        global.fetch = vi.fn(async (input: URL | RequestInfo) => {
            const url = String(input);
            if (url.includes("/api/query/nlq")) {
                return new Response(
                    JSON.stringify({
                        spec: { mode: "simple", intent: "tokenAddress", tokenAddress: "0x1" },
                        warning: "w",
                    }),
                    { status: 200 },
                );
            }
            return new Response(JSON.stringify({ result: { matches: [1] } }), { status: 200 });
        }) as typeof global.fetch;

        const { result } = renderHook(() => useQueryEngine());
        act(() => {
            result.current.setText("find token");
        });

        await act(async () => {
            await result.current.run();
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        expect(result.current.spec).toBeTruthy();
        expect(result.current.result?.kind).toBe("cross_chain");
        expect(result.current.warning).toBe("w");
    });

    it("sets error when NLQ request fails", async () => {
        global.fetch = vi.fn(async () => new Response("err", { status: 500 })) as typeof global.fetch;

        const { result } = renderHook(() => useQueryEngine());
        act(() => {
            result.current.setText("x");
        });

        await act(async () => {
            await result.current.run();
        });

        expect(result.current.error).toContain("NLQ failed");
    });
});
