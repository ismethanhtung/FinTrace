import type { Collection } from "mongodb";
import { getDb } from "../../db/database";
import type { PinRecord } from "./types";

type PinDoc = {
    userId: string;
    pinType: string;
    pinKey: string;
    label?: string;
    payload?: Record<string, unknown>;
    updatedAt: Date;
    createdAt: Date;
};

function collection(): Promise<Collection<PinDoc>> {
    return getDb().then((db) => db.collection<PinDoc>("user_pins"));
}

export async function listUserPins(userId: string): Promise<PinRecord[]> {
    const docs = await (await collection())
        .find({ userId })
        .sort({ updatedAt: -1 })
        .toArray();
    return docs.map((doc) => ({
        pinType: doc.pinType,
        pinKey: doc.pinKey,
        label: doc.label,
        payload: doc.payload,
        updatedAt: doc.updatedAt.toISOString(),
    }));
}

export async function upsertUserPin(
    userId: string,
    input: {
        pinType: string;
        pinKey: string;
        label?: string;
        payload?: Record<string, unknown>;
    },
): Promise<PinRecord> {
    const now = new Date();
    const pinType = input.pinType.trim();
    const pinKey = input.pinKey.trim();

    await (await collection()).updateOne(
        { userId, pinType, pinKey },
        {
            $set: {
                label: input.label?.trim() || undefined,
                payload: input.payload,
                updatedAt: now,
            },
            $setOnInsert: {
                userId,
                pinType,
                pinKey,
                createdAt: now,
            },
        },
        { upsert: true },
    );

    return {
        pinType,
        pinKey,
        label: input.label?.trim() || undefined,
        payload: input.payload,
        updatedAt: now.toISOString(),
    };
}

export async function deleteUserPin(
    userId: string,
    pinType: string,
    pinKey: string,
): Promise<boolean> {
    const result = await (await collection()).deleteOne({
        userId,
        pinType: pinType.trim(),
        pinKey: pinKey.trim(),
    });
    return result.deletedCount > 0;
}
