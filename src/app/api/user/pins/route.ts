import { getAuthenticatedUser } from "../../../../lib/auth/server";
import { ensureUserDataIndexes } from "../../../../lib/db/database";
import { fail, ok } from "../../../../lib/server/http/apiResponse";
import {
    deleteUserPin,
    listUserPins,
    upsertUserPin,
} from "../../../../lib/server/repositories/userPinsRepo";

export const runtime = "nodejs";

function parseCreatePinInput(body: unknown): {
    pinType: string;
    pinKey: string;
    label?: string;
    payload?: Record<string, unknown>;
} | null {
    if (!body || typeof body !== "object") return null;
    const rec = body as Record<string, unknown>;
    if (typeof rec.pinType !== "string" || rec.pinType.trim().length === 0) {
        return null;
    }
    if (typeof rec.pinKey !== "string" || rec.pinKey.trim().length === 0) {
        return null;
    }
    const payload =
        rec.payload && typeof rec.payload === "object" && !Array.isArray(rec.payload)
            ? (rec.payload as Record<string, unknown>)
            : undefined;
    return {
        pinType: rec.pinType.trim(),
        pinKey: rec.pinKey.trim(),
        label: typeof rec.label === "string" ? rec.label : undefined,
        payload,
    };
}

function parseDeletePinInput(body: unknown): { pinType: string; pinKey: string } | null {
    if (!body || typeof body !== "object") return null;
    const rec = body as Record<string, unknown>;
    if (typeof rec.pinType !== "string" || rec.pinType.trim().length === 0) {
        return null;
    }
    if (typeof rec.pinKey !== "string" || rec.pinKey.trim().length === 0) {
        return null;
    }
    return { pinType: rec.pinType.trim(), pinKey: rec.pinKey.trim() };
}

export async function GET() {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        return fail(401, "Authentication required", "UNAUTHORIZED");
    }
    await ensureUserDataIndexes();
    const pins = await listUserPins(auth.userId);
    return ok({ pins });
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

    const input = parseCreatePinInput(body);
    if (!input) {
        return fail(422, "Invalid pin payload", "INVALID_INPUT");
    }
    await ensureUserDataIndexes();
    const pin = await upsertUserPin(auth.userId, input);
    return ok({ pin }, 201);
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
    const input = parseDeletePinInput(body);
    if (!input) {
        return fail(422, "Invalid pin payload", "INVALID_INPUT");
    }
    await ensureUserDataIndexes();
    const deleted = await deleteUserPin(auth.userId, input.pinType, input.pinKey);
    return ok({ deleted });
}
