import { ensureUserDataIndexes, getDb } from "../../../lib/db/database";
import { fail, ok } from "../../../lib/server/http/apiResponse";

const MIN_LEN = 8;
const MAX_LEN = 4000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_PER_WINDOW = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeMessage(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const trimmed = raw.replace(/\u0000/g, "").trim();
    if (trimmed.length < MIN_LEN) return null;
    if (trimmed.length > MAX_LEN) return null;
    return trimmed;
}

function clientIpFromRequest(request: Request): string | null {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim();
        if (first) return first.slice(0, 128);
    }
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp.slice(0, 128);
    return null;
}

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return fail(400, "Invalid JSON body", "INVALID_INPUT");
    }

    if (!isRecord(body)) {
        return fail(400, "Invalid JSON body", "INVALID_INPUT");
    }

    const message = normalizeMessage(body.message);
    if (!message) {
        return fail(
            400,
            `Message must be between ${MIN_LEN} and ${MAX_LEN} characters`,
            "INVALID_INPUT",
            { min: MIN_LEN, max: MAX_LEN },
        );
    }

    const locale =
        typeof body.locale === "string" && body.locale.length <= 16
            ? body.locale.trim().slice(0, 16)
            : null;
    const path =
        typeof body.path === "string" && body.path.length <= 512
            ? body.path.trim().slice(0, 512)
            : null;

    const clientIp = clientIpFromRequest(request);

    try {
        await ensureUserDataIndexes();
        const db = await getDb();
        const col = db.collection("public_feedback");

        if (clientIp) {
            const since = new Date(Date.now() - RATE_WINDOW_MS);
            const recent = await col.countDocuments({
                clientIp,
                createdAt: { $gte: since },
            });
            if (recent >= RATE_MAX_PER_WINDOW) {
                return fail(
                    429,
                    "Too many submissions from this network. Please try again later.",
                    "RATE_LIMITED",
                );
            }
        }

        const createdAt = new Date();
        const ua = request.headers.get("user-agent");
        const result = await col.insertOne({
            message,
            locale,
            path,
            clientIp,
            userAgent: typeof ua === "string" ? ua.slice(0, 512) : null,
            createdAt,
        });

        return ok({ id: result.insertedId.toString(), createdAt: createdAt.toISOString() });
    } catch (error) {
        return fail(500, "Could not save feedback", "INTERNAL_ERROR", {
            message: error instanceof Error ? error.message : String(error),
        });
    }
}
