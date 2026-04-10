"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useUniverse } from "../context/UniverseContext";
import type { AssetUniverse } from "../lib/marketUniverse";

type FavoriteItem = {
    universe: AssetUniverse;
    symbol: string;
    updatedAt: string;
};

const GUEST_FAVORITES_STORAGE_KEY = "ft-guest-favorites-v1";

function loadGuestFavorites(): FavoriteItem[] {
    try {
        const raw = localStorage.getItem(GUEST_FAVORITES_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown[];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(
                (item): item is FavoriteItem =>
                    Boolean(item) &&
                    typeof item === "object" &&
                    (item as FavoriteItem).universe !== undefined &&
                    typeof (item as FavoriteItem).symbol === "string",
            )
            .map((item) => ({
                universe: item.universe === "stock" ? "stock" : "coin",
                symbol: item.symbol.trim().toUpperCase(),
                updatedAt:
                    typeof item.updatedAt === "string"
                        ? item.updatedAt
                        : new Date().toISOString(),
            }));
    } catch {
        return [];
    }
}

function saveGuestFavorites(items: FavoriteItem[]): void {
    try {
        localStorage.setItem(GUEST_FAVORITES_STORAGE_KEY, JSON.stringify(items));
    } catch {
        // ignore localStorage write failures
    }
}

export function useUserFavorites() {
    const { status } = useSession();
    const { universe } = useUniverse();
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        async function load() {
            setIsLoading(true);
            if (status !== "authenticated") {
                const guest = loadGuestFavorites();
                if (active) {
                    setFavorites(guest);
                    setIsLoading(false);
                }
                return;
            }
            try {
                const res = await fetch("/api/user/favorites", { cache: "no-store" });
                if (!res.ok) throw new Error(`Failed to load favorites (${res.status})`);
                const json = (await res.json()) as { favorites?: FavoriteItem[] };
                if (active) {
                    setFavorites(Array.isArray(json.favorites) ? json.favorites : []);
                }
            } catch {
                if (active) setFavorites([]);
            } finally {
                if (active) setIsLoading(false);
            }
        }
        load();
        return () => {
            active = false;
        };
    }, [status]);

    const favoriteSymbolSet = useMemo(
        () => new Set(favorites.filter((f) => f.universe === universe).map((f) => f.symbol)),
        [favorites, universe],
    );

    const isFavorite = useCallback(
        (symbol: string) => favoriteSymbolSet.has(symbol.trim().toUpperCase()),
        [favoriteSymbolSet],
    );

    const addFavorite = useCallback(
        async (symbol: string, targetUniverse: AssetUniverse = universe) => {
            const normalized = symbol.trim().toUpperCase();
            if (!normalized) return;

            const now = new Date().toISOString();
            if (status !== "authenticated") {
                setFavorites((prev) => {
                    const next = prev.filter(
                        (item) =>
                            !(
                                item.universe === targetUniverse &&
                                item.symbol === normalized
                            ),
                    );
                    const appended = [{ universe: targetUniverse, symbol: normalized, updatedAt: now }, ...next];
                    saveGuestFavorites(appended);
                    return appended;
                });
                return;
            }

            await fetch("/api/user/favorites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ universe: targetUniverse, symbol: normalized }),
            });
            setFavorites((prev) => {
                const next = prev.filter(
                    (item) =>
                        !(
                            item.universe === targetUniverse &&
                            item.symbol === normalized
                        ),
                );
                return [{ universe: targetUniverse, symbol: normalized, updatedAt: now }, ...next];
            });
        },
        [status, universe],
    );

    const removeFavorite = useCallback(
        async (symbol: string, targetUniverse: AssetUniverse = universe) => {
            const normalized = symbol.trim().toUpperCase();
            if (!normalized) return;

            if (status !== "authenticated") {
                setFavorites((prev) => {
                    const next = prev.filter(
                        (item) =>
                            !(
                                item.universe === targetUniverse &&
                                item.symbol === normalized
                            ),
                    );
                    saveGuestFavorites(next);
                    return next;
                });
                return;
            }
            await fetch("/api/user/favorites", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ universe: targetUniverse, symbol: normalized }),
            });
            setFavorites((prev) =>
                prev.filter(
                    (item) =>
                        !(
                            item.universe === targetUniverse &&
                            item.symbol === normalized
                        ),
                ),
            );
        },
        [status, universe],
    );

    const toggleFavorite = useCallback(
        async (symbol: string, targetUniverse: AssetUniverse = universe) => {
            if (isFavorite(symbol)) {
                await removeFavorite(symbol, targetUniverse);
                return;
            }
            await addFavorite(symbol, targetUniverse);
        },
        [addFavorite, isFavorite, removeFavorite, universe],
    );

    return {
        favorites,
        isLoading,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite,
    };
}
