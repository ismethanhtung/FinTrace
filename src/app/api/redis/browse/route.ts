import { NextRequest, NextResponse } from "next/server";
import type Redis from "ioredis";
import { getRedis, redisConfigured } from "../../../../lib/redis/server";

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

async function readKeyPayload(
    redis: Redis,
    key: string,
    type: string,
): Promise<{ value: unknown; truncated: boolean }> {
    switch (type) {
        case "string": {
            const buf = await redis.getBuffer(key);
            if (!buf) {
                return { value: null, truncated: false };
            }
            if (buf.length > MAX_STRING_BYTES) {
                const sliced = buf.subarray(0, MAX_STRING_BYTES).toString("utf8");
                return {
                    value: `${sliced}\n… [truncated ${buf.length - MAX_STRING_BYTES} bytes]`,
                    truncated: true,
                };
            }
            const raw = buf.toString("utf8");
            return { value: tryParseJsonString(raw), truncated: false };
        }
        case "hash": {
            const all = await redis.hgetall(key);
            const keys = Object.keys(all);
            if (keys.length > MAX_HASH_FIELDS) {
                const slice: Record<string, string> = {};
                for (const k of keys.slice(0, MAX_HASH_FIELDS)) {
                    slice[k] = all[k]!;
                }
                return { value: slice, truncated: true };
            }
            return { value: all, truncated: false };
        }
        case "list": {
            const len = await redis.llen(key);
            const slice = await redis.lrange(key, 0, MAX_LIST_ELEMENTS - 1);
            return {
                value: slice,
                truncated: len > MAX_LIST_ELEMENTS,
            };
        }
        case "set": {
            const mem = await redis.smembers(key);
            mem.sort((a, b) => a.localeCompare(b));
            if (mem.length > MAX_SET_MEMBERS) {
                return {
                    value: mem.slice(0, MAX_SET_MEMBERS),
                    truncated: true,
                };
            }
            return { value: mem, truncated: false };
        }
        case "zset": {
            const len = await redis.zcard(key);
            const flat = await redis.zrange(
                key,
                0,
                MAX_ZSET_MEMBERS - 1,
                "WITHSCORES",
            );
            const rows: { member: string; score: number }[] = [];
            for (let i = 0; i < flat.length; i += 2) {
                rows.push({
                    member: flat[i]!,
                    score: Number(flat[i + 1]!),
                });
            }
            return { value: rows, truncated: len > MAX_ZSET_MEMBERS };
        }
        case "stream": {
            const rows = await redis.xrevrange(
                key,
                "+",
                "-",
                "COUNT",
                MAX_STREAM_ENTRIES,
            );
            return { value: rows, truncated: false };
        }
        default:
            return {
                value: `[unsupported type: ${type}]`,
                truncated: false,
            };
    }
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
        const redis = getRedis();
        const { keys, nextCursor } = await collectKeys(
            redis,
            cursor,
            pattern,
            limit,
        );

        const entries: Entry[] = [];
        for (const key of keys) {
            const type = await redis.type(key);
            const ttl = await redis.ttl(key);
            const { value, truncated } = await readKeyPayload(redis, key, type);
            entries.push({ key, type, ttl, value, truncated });
        }

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
