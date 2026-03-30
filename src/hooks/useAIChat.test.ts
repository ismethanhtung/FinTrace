// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/aiProviderService", () => ({
    aiProviderService: {},
}));

import { useAIChat } from "./useAIChat";

describe("useAIChat", () => {
    const store = new Map<string, string>();

    beforeEach(() => {
        store.clear();
        vi.stubGlobal("localStorage", {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => {
                store.set(key, value);
            },
            removeItem: (key: string) => {
                store.delete(key);
            },
            clear: () => {
                store.clear();
            },
        });
    });

    it("loads saved sessions but keeps initial view in fresh state", async () => {
        localStorage.setItem(
            "ft-ai-sessions",
            JSON.stringify([
                {
                    id: "s1",
                    title: "Old chat",
                    symbol: "BTCUSDT",
                    messages: [
                        {
                            id: "m1",
                            role: "user",
                            content: "hello",
                            timestamp: Date.now() - 1000,
                        },
                    ],
                    createdAt: Date.now() - 2000,
                    updatedAt: Date.now() - 1000,
                },
            ]),
        );

        const { result } = renderHook(() =>
            useAIChat({
                providerId: "openrouter",
                apiKey: "",
                baseUrl: "",
                model: "demo-model",
                systemPromptTemplate: "x {CONTEXT}",
                symbol: "BTCUSDT",
                contextSummary: "summary",
            }),
        );

        await waitFor(() => {
            expect(result.current.sessions.length).toBe(1);
        });
        expect(result.current.activeSessionId).toBeNull();
        expect(result.current.activeSession).toBeNull();
    });
});
