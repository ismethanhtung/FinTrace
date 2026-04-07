import Redis from "ioredis";

const g = globalThis as unknown as { __fintraceRedis?: Redis };

function requireRedisUrl(): string {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
        throw new Error("REDIS_URL is not configured");
    }
    return url;
}

function redisFriendlyError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOTFOUND")) {
        return [
            "DNS không resolve được host trong REDIS_URL (ENOTFOUND).",
            "Tên `redis` chỉ tồn tại trong Docker Compose.",
            "Chạy Next trên máy thật: mở cổng Redis ra host (ports: \"6379:6379\") và dùng redis://:mk@127.0.0.1:6379, hoặc SSH tunnel / IP máy chủ tương ứng.",
        ].join(" ");
    }
    if (msg.includes("ECONNREFUSED")) {
        return "Redis từ chối kết nối — kiểm tra Redis đã chạy và cổng trong REDIS_URL.";
    }
    return msg;
}

/** Xóa client lỗi để lần gọi sau tạo kết nối mới (sau khi sửa .env). */
export function resetRedisClient(): void {
    const c = g.__fintraceRedis;
    if (c) {
        try {
            c.removeAllListeners();
            c.disconnect();
        } catch {
            /* ignore */
        }
        g.__fintraceRedis = undefined;
    }
}

/**
 * Client Redis cho API route: không reconnect vô hạn, timeout ngắn — tránh treo request 40s+.
 */
export function getRedis(): Redis {
    if (!g.__fintraceRedis) {
        const client = new Redis(requireRedisUrl(), {
            lazyConnect: true,
            connectTimeout: 5_000,
            maxRetriesPerRequest: 1,
            enableReadyCheck: true,
            enableOfflineQueue: false,
            /** Tắt reconnect — mỗi request sẽ connect lại qua singleton sau reset nếu cần */
            retryStrategy: () => null,
            showFriendlyErrorStack: process.env.NODE_ENV === "development",
        });
        client.on("error", (err) => {
            if (process.env.NODE_ENV === "development") {
                console.warn("[redis]", err.message);
            }
        });
        g.__fintraceRedis = client;
    }
    return g.__fintraceRedis;
}

/** Đảm bảo đã kết nối; lỗi thì reset client và ném message thân thiện. */
export async function connectRedisOrThrow(): Promise<Redis> {
    const redis = getRedis();
    try {
        if (redis.status === "ready") {
            return redis;
        }
        await redis.connect();
        return redis;
    } catch (e) {
        resetRedisClient();
        throw new Error(redisFriendlyError(e));
    }
}

export function redisConfigured(): boolean {
    return Boolean(process.env.REDIS_URL?.trim());
}
