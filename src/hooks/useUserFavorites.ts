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

let favoritesCache: FavoriteItem[] | null = null;
let favoritesInflight: Promise<FavoriteItem[]> | null = null;

async function fetchFavorites(): Promise<FavoriteItem[]> {
    if (favoritesCache) return favoritesCache;
    if (favoritesInflight) return favoritesInflight;
    favoritesInflight = fetch("/api/user/favorites", { cache: "no-store" })
        .then(async (res) => {
            if (!res.ok)
                throw new Error(`Failed to load favorites (${res.status})`);
            const json = (await res.json()) as { favorites?: FavoriteItem[] };
            const next = Array.isArray(json.favorites) ? json.favorites : [];
            favoritesCache = next;
            return next;
        })
        .finally(() => {
            favoritesInflight = null;
        });
    return favoritesInflight;
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
                if (active) {
                    setFavorites([]);
                    setIsLoading(false);
                }
                return;
            }
            try {
                const list = await fetchFavorites();
                if (active) {
                    setFavorites(list);
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
        () =>
            new Set(
                favorites
                    .filter((f) => f.universe === universe)
                    .map((f) => f.symbol),
            ),
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
                    return [
                        {
                            universe: targetUniverse,
                            symbol: normalized,
                            updatedAt: now,
                        },
                        ...next,
                    ];
                });
                return;
            }

            await fetch("/api/user/favorites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    universe: targetUniverse,
                    symbol: normalized,
                }),
            });
            setFavorites((prev) => {
                const next = prev.filter(
                    (item) =>
                        !(
                            item.universe === targetUniverse &&
                            item.symbol === normalized
                        ),
                );
                const updated = [
                    {
                        universe: targetUniverse,
                        symbol: normalized,
                        updatedAt: now,
                    },
                    ...next,
                ];
                favoritesCache = updated;
                return updated;
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
                    return prev.filter(
                        (item) =>
                            !(
                                item.universe === targetUniverse &&
                                item.symbol === normalized
                            ),
                    );
                });
                return;
            }
            await fetch("/api/user/favorites", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    universe: targetUniverse,
                    symbol: normalized,
                }),
            });
            setFavorites((prev) => {
                const updated = prev.filter(
                    (item) =>
                        !(
                            item.universe === targetUniverse &&
                            item.symbol === normalized
                        ),
                );
                favoritesCache = updated;
                return updated;
            });
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
