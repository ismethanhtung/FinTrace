import type { Collection } from "mongodb";
import { getDb } from "../../db/database";
import {
    decryptSecret,
    encryptSecret,
    type EncryptedSecret,
    secretEncryptionVersion,
} from "../security/encryption";
import type { AiKeyRecord } from "./types";

type UserAiKeyDoc = {
    userId: string;
    providerId: string;
    keyVersion: number;
    iv: string;
    tag: string;
    ciphertext: string;
    updatedAt: Date;
    createdAt: Date;
};

function collection(): Promise<Collection<UserAiKeyDoc>> {
    return getDb().then((db) => db.collection<UserAiKeyDoc>("user_ai_keys"));
}

function normalizeProviderId(providerId: string): string {
    return providerId.trim().toLowerCase();
}

export async function listUserAiKeys(userId: string): Promise<AiKeyRecord[]> {
    const docs = await (await collection())
        .find({ userId })
        .sort({ updatedAt: -1 })
        .toArray();
    return docs.map((doc) => ({
        providerId: doc.providerId,
        hasKey: true,
        updatedAt: doc.updatedAt.toISOString(),
        keyVersion: doc.keyVersion,
    }));
}

export async function setUserAiKey(
    userId: string,
    providerId: string,
    apiKey: string,
): Promise<AiKeyRecord> {
    const normalizedProviderId = normalizeProviderId(providerId);
    const now = new Date();
    const encrypted = encryptSecret(apiKey.trim());

    await (await collection()).updateOne(
        { userId, providerId: normalizedProviderId },
        {
            $set: {
                keyVersion: encrypted.keyVersion,
                iv: encrypted.iv,
                tag: encrypted.tag,
                ciphertext: encrypted.ciphertext,
                updatedAt: now,
            },
            $setOnInsert: {
                userId,
                providerId: normalizedProviderId,
                createdAt: now,
            },
        },
        { upsert: true },
    );

    return {
        providerId: normalizedProviderId,
        hasKey: true,
        updatedAt: now.toISOString(),
        keyVersion: secretEncryptionVersion,
    };
}

export async function deleteUserAiKey(
    userId: string,
    providerId: string,
): Promise<boolean> {
    const normalizedProviderId = normalizeProviderId(providerId);
    const result = await (await collection()).deleteOne({
        userId,
        providerId: normalizedProviderId,
    });
    return result.deletedCount > 0;
}

export async function getDecryptedUserAiKey(
    userId: string,
    providerId: string,
): Promise<string | null> {
    const normalizedProviderId = normalizeProviderId(providerId);
    const doc = await (await collection()).findOne({
        userId,
        providerId: normalizedProviderId,
    });
    if (!doc) return null;

    const payload: EncryptedSecret = {
        keyVersion: doc.keyVersion,
        iv: doc.iv,
        tag: doc.tag,
        ciphertext: doc.ciphertext,
    };
    return decryptSecret(payload);
}

export async function hasUserAiKey(
    userId: string,
    providerId: string,
): Promise<boolean> {
    const normalizedProviderId = normalizeProviderId(providerId);
    const count = await (await collection()).countDocuments(
        { userId, providerId: normalizedProviderId },
        { limit: 1 },
    );
    return count > 0;
}
