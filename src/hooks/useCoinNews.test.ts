// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/newsService", () => ({
    newsService: {
        getNews: vi.fn(),
    },
}));
vi.mock("../context/UniverseContext", () => ({
    useUniverse: vi.fn(() => ({ universe: "coin" })),
}));

import { newsService } from "../services/newsService";
import { useUniverse } from "../context/UniverseContext";
import { useCoinNews } from "./useCoinNews";

describe("useCoinNews", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useUniverse).mockReturnValue({ universe: "coin" } as any);
    });

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
        expect(newsService.getNews).toHaveBeenCalledWith(
            "BTC",
            undefined,
            10,
            "coin",
        );
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

    it("uses stock universe when available", async () => {
        vi.mocked(useUniverse).mockReturnValue({ universe: "stock" } as any);
        vi.mocked(newsService.getNews).mockResolvedValue([]);

        const { result } = renderHook(() =>
            useCoinNews({ symbol: "SSI", refreshIntervalMs: 999_999 }),
        );
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(newsService.getNews).toHaveBeenCalledWith(
            "SSI",
            undefined,
            10,
            "stock",
        );
    });
});
