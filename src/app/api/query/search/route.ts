import { NextResponse } from "next/server";
import type { QuerySpec } from "../../../../lib/queryEngine/types";
import { validateQuerySpecUnknown } from "../../../../lib/queryEngine/validateQuerySpec";
import { executeQueryV1, type QueryEngineResult } from "../../../../services/queryEngineService";
import { scanTokenSecurityV1 } from "../../../../services/securityAuditService";
import { trackWalletV1 } from "../../../../services/walletTrackingService";

export const runtime = "nodejs";

/**
 * POST /api/query/search
 * Execute QuerySpec -> results (v1).
 */
export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rec = body as Partial<{
        spec: unknown;
    }>;

    if (!rec.spec) {
        return NextResponse.json({ error: "Missing `spec`" }, { status: 400 });
    }

    const validated = validateQuerySpecUnknown(rec.spec);
    if (validated.ok === false) {
        const validationErrors = validated.errors;
        return NextResponse.json(
            { error: "Invalid QuerySpec", details: validationErrors },
            { status: 400 },
        );
    }

    const spec: QuerySpec = validated.spec;

    try {
        if (spec.mode === "simple" || spec.mode === "filtering") {
            const result: QueryEngineResult = await executeQueryV1(spec);
            return NextResponse.json({ result });
        }

        if (spec.mode === "security") {
            if (!spec.tokenAddress) {
                return NextResponse.json(
                    { error: "security mode requires tokenAddress" },
                    { status: 400 },
                );
            }
            const scan = await scanTokenSecurityV1({ tokenAddress: spec.tokenAddress });
            return NextResponse.json({ result: scan });
        }

        if (spec.mode === "wallet") {
            if (!spec.walletAddress) {
                return NextResponse.json(
                    { error: "wallet mode requires walletAddress" },
                    { status: 400 },
                );
            }
            const out = await trackWalletV1({ walletAddress: spec.walletAddress });
            return NextResponse.json({ result: out });
        }

        return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: "Query execution failed", details: message }, { status: 500 });
    }
}

