import type { Collection } from "mongodb";
import { getDb } from "../../db/database";
import type { FavoriteRecord } from "./types";

type FavoriteDoc = {
    userId: string;
    universe: "coin" | "stock";
    symbol: string;
    updatedAt: Date;
    createdAt: Date;
};

function collection(): Promise<Collection<FavoriteDoc>> {
    return getDb().then((db) => db.collection<FavoriteDoc>("user_favorites"));
}

export async function listUserFavorites(userId: string): Promise<FavoriteRecord[]> {
    const docs = await (await collection())
        .find({ userId })
        .sort({ updatedAt: -1 })
        .toArray();
    return docs.map((doc) => ({
        universe: doc.universe,
        symbol: doc.symbol,
        updatedAt: doc.updatedAt.toISOString(),
    }));
}

export async function upsertUserFavorite(
    userId: string,
    universe: "coin" | "stock",
    symbol: string,
): Promise<FavoriteRecord> {
    const now = new Date();
    const normalizedSymbol = symbol.trim().toUpperCase();

    await (await collection()).updateOne(
        { userId, universe, symbol: normalizedSymbol },
        {
            $set: {
                updatedAt: now,
            },
            $setOnInsert: {
                userId,
                universe,
                symbol: normalizedSymbol,
                createdAt: now,
            },
        },
        { upsert: true },
    );

    return {
        universe,
        symbol: normalizedSymbol,
        updatedAt: now.toISOString(),
    };
}

export async function deleteUserFavorite(
    userId: string,
    universe: "coin" | "stock",
    symbol: string,
): Promise<boolean> {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const result = await (await collection()).deleteOne({
        userId,
        universe,
        symbol: normalizedSymbol,
    });
    return result.deletedCount > 0;
}
