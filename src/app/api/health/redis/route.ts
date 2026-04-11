import {
    connectRedisOrThrow,
    getConfiguredRedisDb,
    redisConfigured,
} from "../../../../lib/redis/server";
import { fail, ok } from "../../../../lib/server/http/apiResponse";

export async function GET() {
    const startedAt = Date.now();
    if (!redisConfigured()) {
        return fail(
            503,
            "Redis is not configured",
            "INVALID_INPUT",
            {
                message:
                    "Thiếu REDIS_URL trong biến môi trường — bỏ qua test hoặc cấu hình redis://…",
            },
        );
    }
    try {
        const redis = await connectRedisOrThrow();
        await redis.select(getConfiguredRedisDb());
        const pong = await redis.ping();
        if (pong !== "PONG") {
            return fail(500, "Redis PING unexpected reply", "INTERNAL_ERROR", {
                message: String(pong),
            });
        }
        return ok({
            status: "ok",
            db: getConfiguredRedisDb(),
            latencyMs: Date.now() - startedAt,
            checkedAt: new Date().toISOString(),
        });
    } catch (error) {
        return fail(500, "Redis connection failed", "INTERNAL_ERROR", {
            message: error instanceof Error ? error.message : String(error),
        });
    }
}
