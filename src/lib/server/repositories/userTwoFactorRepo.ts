import type { Collection } from "mongodb";
import { getDb } from "../../db/database";

type UserTwoFactorDoc = {
    userId: string;
    enabled: boolean;
    secret?: string;
    pendingSecret?: string;
    pendingSetupExpiresAt?: Date;
    enabledAt?: Date;
    updatedAt: Date;
    createdAt: Date;
};

function collection(): Promise<Collection<UserTwoFactorDoc>> {
    return getDb().then((db) => db.collection<UserTwoFactorDoc>("user_two_factor"));
}

export async function getUserTwoFactor(userId: string): Promise<UserTwoFactorDoc | null> {
    return (await collection()).findOne({ userId });
}

export async function savePendingTwoFactorSetup(
    userId: string,
    pendingSecret: string,
    expiresAt: Date,
): Promise<void> {
    const now = new Date();
    await (await collection()).updateOne(
        { userId },
        {
            $set: {
                userId,
                enabled: false,
                pendingSecret,
                pendingSetupExpiresAt: expiresAt,
                updatedAt: now,
            },
            $setOnInsert: {
                createdAt: now,
            },
            $unset: {
                secret: "",
                enabledAt: "",
            },
        },
        { upsert: true },
    );
}

export async function enableUserTwoFactor(userId: string, secret: string): Promise<void> {
    const now = new Date();
    await (await collection()).updateOne(
        { userId },
        {
            $set: {
                userId,
                enabled: true,
                secret,
                enabledAt: now,
                updatedAt: now,
            },
            $setOnInsert: {
                createdAt: now,
            },
            $unset: {
                pendingSecret: "",
                pendingSetupExpiresAt: "",
            },
        },
        { upsert: true },
    );
}

export async function disableUserTwoFactor(userId: string): Promise<void> {
    const now = new Date();
    await (await collection()).updateOne(
        { userId },
        {
            $set: {
                userId,
                enabled: false,
                updatedAt: now,
            },
            $setOnInsert: {
                createdAt: now,
            },
            $unset: {
                secret: "",
                pendingSecret: "",
                pendingSetupExpiresAt: "",
                enabledAt: "",
            },
        },
        { upsert: true },
    );
}

