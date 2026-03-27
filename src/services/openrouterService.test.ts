import { describe, expect, it, vi } from "vitest";

vi.mock("./aiProviderService", () => ({
    aiProviderService: {
        getModels: vi.fn(),
        chat: vi.fn(),
        chatStream: vi.fn(),
    },
}));

import { aiProviderService } from "./aiProviderService";
import { openrouterService } from "./openrouterService";

describe("openrouterService", () => {
    it("delegates getModels to aiProviderService with provider openrouter", async () => {
        vi.mocked(aiProviderService.getModels).mockResolvedValue([]);
        await openrouterService.getModels("k");
        expect(aiProviderService.getModels).toHaveBeenCalledWith("openrouter", "k");
    });

    it("delegates chat to aiProviderService", async () => {
        vi.mocked(aiProviderService.chat).mockResolvedValue("ok");
        const out = await openrouterService.chat("k", "model", [
            { role: "user", content: "hi" },
        ]);
        expect(out).toBe("ok");
        expect(aiProviderService.chat).toHaveBeenCalledWith(
            "openrouter",
            "k",
            "model",
            [{ role: "user", content: "hi" }],
            undefined,
        );
    });
});
