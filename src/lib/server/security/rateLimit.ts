type RateLimitState = {
    count: number;
    resetAt: number;
};

const buckets = new Map<string, RateLimitState>();

export function rateLimit(input: {
    key: string;
    max: number;
    windowMs: number;
}): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const existing = buckets.get(input.key);

    if (!existing || existing.resetAt <= now) {
        buckets.set(input.key, {
            count: 1,
            resetAt: now + input.windowMs,
        });
        return { allowed: true, retryAfterSeconds: Math.ceil(input.windowMs / 1000) };
    }

    existing.count += 1;
    buckets.set(input.key, existing);
    const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
    );
    return {
        allowed: existing.count <= input.max,
        retryAfterSeconds,
    };
}

export function clientKeyFromRequest(req: Request): string {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0].trim();
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    return "unknown";
}
