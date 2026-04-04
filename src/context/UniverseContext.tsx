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
import {
    persistClientPreferenceCookie,
    UNIVERSE_COOKIE_KEY,
} from "../lib/preferences";

export type UniverseContextValue = {
    universe: AssetUniverse;
    setUniverse: (next: AssetUniverse) => void;
    isHydrated: boolean;
    isMockUniverse: boolean;
    routeSwitch: (next: AssetUniverse) => void;
};

const UniverseContext = createContext<UniverseContextValue | null>(null);

export const UniverseProvider = ({
    children,
    initialUniverse = "coin",
}: {
    children: React.ReactNode;
    initialUniverse?: AssetUniverse;
}) => {
    const [universe, setUniverseState] = useState<AssetUniverse>(initialUniverse);
    const [isHydrated, setIsHydrated] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        try {
            const raw = localStorage.getItem(UNIVERSE_STORAGE_KEY);
            if (raw) {
                const normalized = normalizeUniverse(raw);
                setUniverseState(normalized);
                persistClientPreferenceCookie(UNIVERSE_COOKIE_KEY, normalized);
            } else {
                persistClientPreferenceCookie(
                    UNIVERSE_COOKIE_KEY,
                    initialUniverse,
                );
            }
        } catch {
            // ignore localStorage failures
        } finally {
            setIsHydrated(true);
        }
    }, [initialUniverse]);

    const setUniverse = useCallback((next: AssetUniverse) => {
        setUniverseState(next);
        try {
            localStorage.setItem(UNIVERSE_STORAGE_KEY, next);
        } catch {
            // ignore localStorage failures
        }
        persistClientPreferenceCookie(UNIVERSE_COOKIE_KEY, next);
    }, []);

    const routeSwitch = useCallback(
        (next: AssetUniverse) => {
            setUniverse(next);
            const target = resolveUniverseSwitchPath(pathname || "/", next);
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
            isMockUniverse: universe === "stock",
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
    if (!ctx)
        throw new Error("useUniverse must be used within a UniverseProvider");
    return ctx;
}
