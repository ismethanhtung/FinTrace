import { Db } from "mongodb";
import { mongoClientPromise } from "./mongoClient";

const DB_NAME = process.env.MONGODB_DB_NAME || "fintrace";

let cachedDb: Db | null = null;
let indexReadyPromise: Promise<void> | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const client = await mongoClientPromise;
  cachedDb = client.db(DB_NAME);
  return cachedDb;
}

async function ensureUserDataIndexesInternal(): Promise<void> {
  const db = await getDb();

  await db.collection("user_favorites").createIndex(
    { userId: 1, universe: 1, symbol: 1 },
    { unique: true, name: "uniq_user_universe_symbol" },
  );

  await db.collection("user_favorites").createIndex(
    { userId: 1, updatedAt: -1 },
    { name: "idx_user_favorites_updated" },
  );

  await db.collection("user_pins").createIndex(
    { userId: 1, pinType: 1, pinKey: 1 },
    { unique: true, name: "uniq_user_pin" },
  );

  await db.collection("user_pins").createIndex(
    { userId: 1, updatedAt: -1 },
    { name: "idx_user_pins_updated" },
  );

  await db.collection("user_ai_keys").createIndex(
    { userId: 1, providerId: 1 },
    { unique: true, name: "uniq_user_provider_key" },
  );

  await db.collection("user_ai_keys").createIndex(
    { userId: 1, updatedAt: -1 },
    { name: "idx_user_ai_keys_updated" },
  );

  await db.collection("user_preferences").createIndex(
    { userId: 1 },
    { unique: true, name: "uniq_user_preferences" },
  );

  await db.collection("users").createIndex(
    { email: 1 },
    { unique: true, sparse: true, name: "uniq_users_email" },
  );

  await db.collection("sessions").createIndex(
    { userId: 1, expires: 1 },
    { name: "idx_sessions_user_expires" },
  );

  await db.collection("session_meta").createIndex(
    { userId: 1, sessionTokenHash: 1 },
    { unique: true, name: "uniq_user_session_meta" },
  );

  await db.collection("session_meta").createIndex(
    { userId: 1, lastSeenAt: -1 },
    { name: "idx_session_meta_last_seen" },
  );
}

export async function ensureUserDataIndexes(): Promise<void> {
  if (!indexReadyPromise) {
    indexReadyPromise = ensureUserDataIndexesInternal().catch((error) => {
      indexReadyPromise = null;
      throw error;
    });
  }

  return indexReadyPromise;
}
