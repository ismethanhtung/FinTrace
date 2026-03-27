import { describe, expect, it, vi } from "vitest";

import { aiProviderService } from "./aiProviderService";

describe("aiProviderService", () => {
    it("returns empty models on 401 and does not throw", async () => {
        global.fetch = vi.fn(async () => new Response("unauthorized", { status: 401 })) as typeof global.fetch;
        const models = await aiProviderService.getModels("openrouter", "bad-key");
        expect(models).toEqual([]);
    });

    it("filters invalid models and sorts by name/id", async () => {
        global.fetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    data: [
                        { id: "z-model" },
                        { id: "a-model", name: "Alpha" },
                        { id: "" },
                        { foo: "bar" },
                    ],
                }),
                { status: 200 },
            ),
        ) as typeof global.fetch;

        const models = await aiProviderService.getModels("groq", "key");
        expect(models.map((m) => m.id)).toEqual(["a-model", "z-model"]);
    });

    it("returns non-stream chat content", async () => {
        global.fetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    choices: [{ message: { content: "hello" } }],
                }),
                { status: 200 },
            ),
        ) as typeof global.fetch;

        const out = await aiProviderService.chat("openrouter", "k", "m", [
            { role: "user", content: "hi" },
        ]);
        expect(out).toBe("hello");
    });

    it("throws detailed error when chat stream fails", async () => {
        global.fetch = vi.fn(async () => new Response("boom", { status: 500 })) as typeof global.fetch;

        await expect(
            aiProviderService.chatStream(
                "huggingface",
                "k",
                "m",
                [{ role: "user", content: "x" }],
                () => undefined,
            ),
        ).rejects.toThrow("[huggingface] stream error 500: boom");
    });

    it("parses SSE stream chunks and aggregates full text", async () => {
        const chunks = [
            new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hel"}}]}\n'),
            new TextEncoder().encode('data: {"choices":[{"delta":{"content":"lo"}}]}\n'),
            new TextEncoder().encode("data: [DONE]\n"),
        ];

        let i = 0;
        const reader = {
            read: vi.fn(async () => {
                if (i >= chunks.length) return { done: true, value: undefined };
                return { done: false, value: chunks[i++] };
            }),
            releaseLock: vi.fn(),
        };

        const response = {
            ok: true,
            status: 200,
            body: { getReader: () => reader },
        } as unknown as Response;

        global.fetch = vi.fn(async () => response) as typeof global.fetch;

        const onChunk = vi.fn();
        const full = await aiProviderService.chatStream(
            "openrouter",
            "k",
            "m",
            [{ role: "user", content: "x" }],
            onChunk,
        );

        expect(full).toBe("Hello");
        expect(onChunk).toHaveBeenCalledTimes(2);
        expect(reader.releaseLock).toHaveBeenCalled();
    });
});
