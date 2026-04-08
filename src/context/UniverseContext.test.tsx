// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { UniverseProvider, useUniverse } from "./UniverseContext";
import { UNIVERSE_STORAGE_KEY } from "../lib/marketUniverse";

const pushMock = vi.fn();
let pathnameMock = "/market";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
    usePathname: () => pathnameMock,
}));

function Probe() {
    const { universe, routeSwitch } = useUniverse();
    return (
        <div>
            <span data-testid="universe">{universe}</span>
            <button onClick={() => routeSwitch("stock")}>switch</button>
        </div>
    );
}

describe("UniverseContext", () => {
    const storage = new Map<string, string>();

    beforeEach(() => {
        storage.clear();
        vi.stubGlobal("localStorage", {
            getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
            setItem: (key: string, value: string) => {
                storage.set(key, value);
            },
            removeItem: (key: string) => {
                storage.delete(key);
            },
            clear: () => storage.clear(),
        });
        pushMock.mockClear();
        pathnameMock = "/market";
    });

    afterEach(() => {
        cleanup();
    });

    it("loads saved universe from localStorage", async () => {
        localStorage.setItem(UNIVERSE_STORAGE_KEY, "stock");
        render(
            <UniverseProvider>
                <Probe />
            </UniverseProvider>,
        );
        await waitFor(() => {
            expect(screen.getByTestId("universe").textContent).toBe("stock");
        });
    });

    it("falls back route for unsupported path while switching", () => {
        pathnameMock = "/unsupported";
        render(
            <UniverseProvider>
                <Probe />
            </UniverseProvider>,
        );
        fireEvent.click(screen.getByText("switch"));
        // Switching to stock should land on stock-friendly default route.
        expect(pushMock).toHaveBeenCalledWith("/board");
    });
});
