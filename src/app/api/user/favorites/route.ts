import { getAuthenticatedUser } from "../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../lib/db/database";
import { fail, ok } from "../../../../lib/server/http/apiResponse";
import {
    deleteUserFavorite,
    listUserFavorites,
    upsertUserFavorite,
} from "../../../../lib/server/repositories/userFavoritesRepo";

export const runtime = "nodejs";

function isUniverse(value: unknown): value is "coin" | "stock" {
    return value === "coin" || value === "stock";
}

function readInput(input: unknown): { universe: "coin" | "stock"; symbol: string } | null {
    if (!input || typeof input !== "object") return null;
    const rec = input as Record<string, unknown>;
    if (!isUniverse(rec.universe)) return null;
    if (typeof rec.symbol !== "string" || rec.symbol.trim().length === 0) return null;
    return {
        universe: rec.universe,
        symbol: rec.symbol.trim().toUpperCase(),
    };
}

export async function GET() {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }
    await ensureUserDataIndexes();
    const favorites = await listUserFavorites(auth.userId);
    return ok({ favorites });
}

export async function POST(request: Request) {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return fail(422, "Invalid JSON payload", "INVALID_INPUT");
    }

    const input = readInput(body);
    if (!input) {
        return fail(422, "Invalid favorite payload", "INVALID_INPUT");
    }

    await ensureUserDataIndexes();
    const favorite = await upsertUserFavorite(
        auth.userId,
        input.universe,
        input.symbol,
    );
    return ok({ favorite }, 201);
}

export async function DELETE(request: Request) {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return fail(422, "Invalid JSON payload", "INVALID_INPUT");
    }
    const input = readInput(body);
    if (!input) {
        return fail(422, "Invalid favorite payload", "INVALID_INPUT");
    }
    await ensureUserDataIndexes();
    const deleted = await deleteUserFavorite(
        auth.userId,
        input.universe,
        input.symbol,
    );
    return ok({ deleted });
}
