import { NextRequest, NextResponse } from "next/server";
import type Redis from "ioredis";
import {
    connectRedisOrThrow,
    getConfiguredRedisDb,
    redisConfigured,
} from "../../../../lib/redis/server";

export const runtime = "nodejs";

const MAX_KEYS_PER_REQUEST = Math.min(
    Math.max(1, Number(process.env.REDIS_BROWSE_PAGE_SIZE) || 250),
    2000,
);

const MAX_STRING_BYTES = 200_000;
const MAX_LIST_ELEMENTS = 200;
const MAX_HASH_FIELDS = 400;
const MAX_SET_MEMBERS = 400;
const MAX_ZSET_MEMBERS = 200;
const MAX_STREAM_ENTRIES = 80;

type Entry = {
    key: string;
    type: string;
    ttl: number;
    value: unknown;
    truncated: boolean;
};
type RedisReply<T> = [Error | null, T];

async function collectKeys(
    redis: Redis,
    startCursor: string,
    pattern: string,
    want: number,
): Promise<{ keys: string[]; nextCursor: string }> {
    let cursor = startCursor;
    const keys: string[] = [];
    const safePattern = pattern.trim() || "*";

    do {
        const [next, batch] = await redis.scan(
            cursor,
            "MATCH",
            safePattern,
            "COUNT",
            Math.min(800, want * 4),
        );
        cursor = next;
        for (const k of batch) {
            keys.push(k);
            if (keys.length >= want) {
                return { keys, nextCursor: cursor };
            }
        }
    } while (cursor !== "0");

    return { keys, nextCursor: "0" };
}

function tryParseJsonString(raw: string): unknown {
    const t = raw.trim();
    if (
        (t.startsWith("{") && t.endsWith("}")) ||
        (t.startsWith("[") && t.endsWith("]"))
    ) {
        try {
            return JSON.parse(t) as unknown;
        } catch {
            /* keep string */
        }
    }
    return raw;
}

function replyValue<T>(reply: RedisReply<T> | undefined): T | null {
    if (!reply) return null;
    const [err, value] = reply;
    if (err) return null;
    return value;
}

async function readEntriesBatched(redis: Redis, keys: string[]): Promise<Entry[]> {
    if (!keys.length) return [];

    const metaPipe = redis.pipeline();
    for (const key of keys) {
        metaPipe.type(key);
        metaPipe.ttl(key);
    }
    const metaReplies = (await metaPipe.exec()) as RedisReply<string | number>[];

    const entries: Entry[] = keys.map((key, idx) => {
        const type = String(replyValue(metaReplies[idx * 2]) ?? "none");
        const ttlRaw = Number(replyValue(metaReplies[idx * 2 + 1]) ?? -2);
        return {
            key,
            type,
            ttl: Number.isFinite(ttlRaw) ? ttlRaw : -2,
            value: null,
            truncated: false,
        };
    });

    const byType = new Map<string, number[]>();
    for (let i = 0; i < entries.length; i += 1) {
        const type = entries[i]!.type;
        if (!byType.has(type)) byType.set(type, []);
        byType.get(type)!.push(i);
    }

    const fillString = async (indexes: number[]) => {
        const p = redis.pipeline();
        for (const i of indexes) p.getBuffer(entries[i]!.key);
        const replies = (await p.exec()) as RedisReply<Buffer | null>[];
        indexes.forEach((entryIdx, rIdx) => {
            const buf = replyValue(replies[rIdx]);
            if (!buf) {
                entries[entryIdx]!.value = null;
                return;
            }
            if (buf.length > MAX_STRING_BYTES) {
                const sliced = buf.subarray(0, MAX_STRING_BYTES).toString("utf8");
                entries[entryIdx]!.value =
                    `${sliced}\n… [truncated ${buf.length - MAX_STRING_BYTES} bytes]`;
                entries[entryIdx]!.truncated = true;
                return;
            }
            entries[entryIdx]!.value = tryParseJsonString(buf.toString("utf8"));
        });
    };

    const fillHash = async (indexes: number[]) => {
        const p = redis.pipeline();
        for (const i of indexes) p.hgetall(entries[i]!.key);
        const replies = (await p.exec()) as RedisReply<Record<string, string>>[];
        indexes.forEach((entryIdx, rIdx) => {
            const all = replyValue(replies[rIdx]) ?? {};
            const ks = Object.keys(all);
            if (ks.length > MAX_HASH_FIELDS) {
                const slice: Record<string, string> = {};
                for (const k of ks.slice(0, MAX_HASH_FIELDS)) slice[k] = all[k]!;
                entries[entryIdx]!.value = slice;
                entries[entryIdx]!.truncated = true;
                return;
            }
            entries[entryIdx]!.value = all;
        });
    };

    const fillList = async (indexes: number[]) => {
        const p = redis.pipeline();
        for (const i of indexes) {
            p.llen(entries[i]!.key);
            p.lrange(entries[i]!.key, 0, MAX_LIST_ELEMENTS - 1);
        }
        const replies = (await p.exec()) as RedisReply<number | string[]>[];
        indexes.forEach((entryIdx, rIdx) => {
            const len = Number(replyValue(replies[rIdx * 2]) ?? 0);
            const slice = (replyValue(replies[rIdx * 2 + 1]) ?? []) as string[];
            entries[entryIdx]!.value = slice;
            entries[entryIdx]!.truncated = len > MAX_LIST_ELEMENTS;
        });
    };

    const fillSet = async (indexes: number[]) => {
        const p = redis.pipeline();
        for (const i of indexes) p.smembers(entries[i]!.key);
        const replies = (await p.exec()) as RedisReply<string[]>[];
        indexes.forEach((entryIdx, rIdx) => {
            const members = [...((replyValue(replies[rIdx]) ?? []) as string[])];
            members.sort((a, b) => a.localeCompare(b));
            if (members.length > MAX_SET_MEMBERS) {
                entries[entryIdx]!.value = members.slice(0, MAX_SET_MEMBERS);
                entries[entryIdx]!.truncated = true;
                return;
            }
            entries[entryIdx]!.value = members;
        });
    };

    const fillZSet = async (indexes: number[]) => {
        const p = redis.pipeline();
        for (const i of indexes) {
            p.zcard(entries[i]!.key);
            p.zrange(entries[i]!.key, 0, MAX_ZSET_MEMBERS - 1, "WITHSCORES");
        }
        const replies = (await p.exec()) as RedisReply<number | string[]>[];
        indexes.forEach((entryIdx, rIdx) => {
            const len = Number(replyValue(replies[rIdx * 2]) ?? 0);
            const flat = (replyValue(replies[rIdx * 2 + 1]) ?? []) as string[];
            const rows: { member: string; score: number }[] = [];
            for (let i = 0; i < flat.length; i += 2) {
                rows.push({ member: flat[i]!, score: Number(flat[i + 1]!) });
            }
            entries[entryIdx]!.value = rows;
            entries[entryIdx]!.truncated = len > MAX_ZSET_MEMBERS;
        });
    };

    const fillStream = async (indexes: number[]) => {
        const p = redis.pipeline();
        for (const i of indexes) {
            p.xrevrange(entries[i]!.key, "+", "-", "COUNT", MAX_STREAM_ENTRIES);
        }
        const replies = (await p.exec()) as RedisReply<unknown[]>[];
        indexes.forEach((entryIdx, rIdx) => {
            entries[entryIdx]!.value = replyValue(replies[rIdx]) ?? [];
        });
    };

    await Promise.all([
        byType.get("string")?.length ? fillString(byType.get("string")!) : null,
        byType.get("hash")?.length ? fillHash(byType.get("hash")!) : null,
        byType.get("list")?.length ? fillList(byType.get("list")!) : null,
        byType.get("set")?.length ? fillSet(byType.get("set")!) : null,
        byType.get("zset")?.length ? fillZSet(byType.get("zset")!) : null,
        byType.get("stream")?.length ? fillStream(byType.get("stream")!) : null,
    ]);

    for (const e of entries) {
        if (e.value !== null) continue;
        if (
            e.type !== "string" &&
            e.type !== "hash" &&
            e.type !== "list" &&
            e.type !== "set" &&
            e.type !== "zset" &&
            e.type !== "stream"
        ) {
            e.value = `[unsupported type: ${e.type}]`;
        }
    }

    return entries;
}

export async function GET(req: NextRequest) {
    if (!redisConfigured()) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    "REDIS_URL chưa được cấu hình. Thêm REDIS_URL vào môi trường (ví dụ .env.local).",
            },
            { status: 503 },
        );
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") ?? "0";
    const pattern = searchParams.get("pattern") ?? "*";
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw
        ? Math.min(2000, Math.max(1, Number(limitRaw) || MAX_KEYS_PER_REQUEST))
        : MAX_KEYS_PER_REQUEST;

    try {
        const redis = await connectRedisOrThrow();
        // Force selected DB per request to avoid shared-connection DB drift.
        await redis.select(getConfiguredRedisDb());
        const { keys, nextCursor } = await collectKeys(
            redis,
            cursor,
            pattern,
            limit,
        );

        const entries = await readEntriesBatched(redis, keys);

        entries.sort((a, b) => a.key.localeCompare(b.key));

        return NextResponse.json({
            ok: true,
            fetchedAt: new Date().toISOString(),
            pattern: pattern.trim() || "*",
            nextCursor,
            hasMore: nextCursor !== "0",
            count: entries.length,
            entries,
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json(
            { ok: false, error: message },
            { status: 502 },
        );
    }
}
