import { ObjectId } from "mongodb";
import { getDb } from "../../db/database";

function buildIdCandidates(userId: string): Array<string | ObjectId> {
    const candidates: Array<string | ObjectId> = [userId];
    if (ObjectId.isValid(userId)) {
        candidates.push(new ObjectId(userId));
    }
    return candidates;
}

export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
    const db = await getDb();
    const userIds = buildIdCandidates(userId);

    const [
        favorites,
        pins,
        aiKeys,
        preferences,
        twoFactor,
        sessions,
        sessionMeta,
    ] = await Promise.all([
        db.collection("user_favorites").find({ userId: { $in: userIds } }).toArray(),
        db.collection("user_pins").find({ userId: { $in: userIds } }).toArray(),
        db.collection("user_ai_keys").find({ userId: { $in: userIds } }).toArray(),
        db.collection("user_preferences").find({ userId: { $in: userIds } }).toArray(),
        db.collection("user_two_factor")
            .find({ userId: { $in: userIds } })
            .project({
                _id: 1,
                userId: 1,
                enabled: 1,
                enabledAt: 1,
                updatedAt: 1,
                createdAt: 1,
            })
            .toArray(),
        db.collection("sessions")
            .find({ userId: { $in: userIds } })
            .project({
                _id: 1,
                userId: 1,
                expires: 1,
            })
            .toArray(),
        db.collection("session_meta").find({ userId }).toArray(),
    ]);

    return {
        exportedAt: new Date().toISOString(),
        userId,
        collections: {
            user_favorites: favorites,
            user_pins: pins,
            user_ai_keys: aiKeys,
            user_preferences: preferences,
            user_two_factor: twoFactor,
            sessions,
            session_meta: sessionMeta,
        },
    };
}

export async function deleteAllUserData(userId: string): Promise<{
    deleted: Record<string, number>;
}> {
    const db = await getDb();
    const userIds = buildIdCandidates(userId);

    const [favorites, pins, aiKeys, preferences, twoFactor, sessionMeta] =
        await Promise.all([
            db.collection("user_favorites").deleteMany({ userId: { $in: userIds } }),
            db.collection("user_pins").deleteMany({ userId: { $in: userIds } }),
            db.collection("user_ai_keys").deleteMany({ userId: { $in: userIds } }),
            db.collection("user_preferences").deleteMany({ userId: { $in: userIds } }),
            db.collection("user_two_factor").deleteMany({ userId: { $in: userIds } }),
            db.collection("session_meta").deleteMany({ userId }),
        ]);

    return {
        deleted: {
            user_favorites: favorites.deletedCount ?? 0,
            user_pins: pins.deletedCount ?? 0,
            user_ai_keys: aiKeys.deletedCount ?? 0,
            user_preferences: preferences.deletedCount ?? 0,
            user_two_factor: twoFactor.deletedCount ?? 0,
            session_meta: sessionMeta.deletedCount ?? 0,
        },
    };
}

