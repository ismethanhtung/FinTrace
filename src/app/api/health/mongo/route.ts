import { ensureUserDataIndexes, getDb } from "../../../../lib/db/database";
import { fail, ok } from "../../../../lib/server/http/apiResponse";

export const runtime = "nodejs";

export async function GET() {
    const startedAt = Date.now();
    try {
        const db = await getDb();
        await db.command({ ping: 1 });
        await ensureUserDataIndexes();
        return ok({
            status: "ok",
            database: db.databaseName,
            latencyMs: Date.now() - startedAt,
            checkedAt: new Date().toISOString(),
        });
    } catch (error) {
        return fail(500, "MongoDB connection failed", "INTERNAL_ERROR", {
            message: error instanceof Error ? error.message : String(error),
        });
    }
}

