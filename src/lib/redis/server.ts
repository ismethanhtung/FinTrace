import Redis from "ioredis";

const g = globalThis as unknown as { __fintraceRedis?: Redis };

function requireRedisUrl(): string {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
        throw new Error("REDIS_URL is not configured");
    }
    return url;
}

/** Singleton Redis client for server-side API routes (Node runtime). */
export function getRedis(): Redis {
    if (!g.__fintraceRedis) {
        g.__fintraceRedis = new Redis(requireRedisUrl(), {
            maxRetriesPerRequest: 2,
            enableReadyCheck: true,
            lazyConnect: false,
        });
    }
    return g.__fintraceRedis;
}

export function redisConfigured(): boolean {
    return Boolean(process.env.REDIS_URL?.trim());
}
