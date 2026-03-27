// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../services/newsService", () => ({
    newsService: {
        getNews: vi.fn(),
    },
}));

import { newsService } from "../services/newsService";
import { useCoinNews } from "./useCoinNews";

describe("useCoinNews", () => {
    it("loads news and exposes normalized base symbol", async () => {
        vi.mocked(newsService.getNews).mockResolvedValue([
            {
                id: "1",
                title: "BTC",
                url: "#",
                source: "x",
                publishedAt: new Date().toISOString(),
                relativeTime: "now",
            },
        ] as any);

        const { result } = renderHook(() =>
            useCoinNews({ symbol: "BTCUSDT", refreshIntervalMs: 999_999 }),
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        expect(result.current.baseSymbol).toBe("BTC");
        expect(result.current.news).toHaveLength(1);
    });

    it("sets error when service throws", async () => {
        vi.mocked(newsService.getNews).mockRejectedValue(new Error("boom"));
        const { result } = renderHook(() =>
            useCoinNews({ symbol: "ETHUSDT", refreshIntervalMs: 999_999 }),
        );
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        expect(result.current.error).toContain("boom");
    });
});
