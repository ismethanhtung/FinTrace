"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    AssetUniverse,
    UNIVERSE_STORAGE_KEY,
    normalizeUniverse,
    resolveUniverseSwitchPath,
} from "../lib/marketUniverse";

export type UniverseContextValue = {
    universe: AssetUniverse;
    setUniverse: (next: AssetUniverse) => void;
    isHydrated: boolean;
    routeSwitch: (next: AssetUniverse) => void;
};

const UniverseContext = createContext<UniverseContextValue | null>(null);

export const UniverseProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const [universe, setUniverseState] = useState<AssetUniverse>("coin");
    const [isHydrated, setIsHydrated] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        try {
            const raw = localStorage.getItem(UNIVERSE_STORAGE_KEY);
            if (raw) {
                setUniverseState(normalizeUniverse(raw));
            }
        } catch {
            // ignore localStorage failures
        } finally {
            setIsHydrated(true);
        }
    }, []);

    const setUniverse = useCallback((next: AssetUniverse) => {
        setUniverseState(next);
        try {
            localStorage.setItem(UNIVERSE_STORAGE_KEY, next);
        } catch {
            // ignore localStorage failures
        }
    }, []);

    const routeSwitch = useCallback(
        (next: AssetUniverse) => {
            setUniverse(next);
            const target = resolveUniverseSwitchPath(pathname || "/");
            if (target !== (pathname || "/")) {
                router.push(target);
            }
        },
        [pathname, router, setUniverse],
    );

    const value = useMemo<UniverseContextValue>(
        () => ({
            universe,
            setUniverse,
            isHydrated,
            routeSwitch,
        }),
        [isHydrated, routeSwitch, setUniverse, universe],
    );

    return (
        <UniverseContext.Provider value={value}>
            {children}
        </UniverseContext.Provider>
    );
};

export function useUniverse(): UniverseContextValue {
    const ctx = useContext(UniverseContext);
    if (!ctx) throw new Error("useUniverse must be used within a UniverseProvider");
    return ctx;
}
