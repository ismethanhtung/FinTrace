import type {
    NumericFilter,
    NumericOp,
    QueryIntent,
    QueryMode,
    QuerySpec,
    QuerySpecValidationResult,
    ScreeningFilters,
} from "./types";

function isNumericOp(op: string): op is NumericOp {
    return op === "lt" || op === "lte" || op === "gt" || op === "gte";
}

function isQueryMode(mode: string): mode is QueryMode {
    return mode === "simple" || mode === "filtering" || mode === "wallet" || mode === "security";
}

function isQueryIntent(intent: string): intent is QueryIntent {
    return intent === "tokenAddress" || intent === "walletAddress" || intent === "keyword" || intent === "unknown";
}

function isFiniteNumber(n: unknown): n is number {
    return typeof n === "number" && Number.isFinite(n);
}

function validateNumericFilter(raw: unknown, path: string): { ok: true; value: NumericFilter } | { ok: false; error: string } {
    const rec = raw as { op?: unknown; valueUsd?: unknown };
    if (!rec || typeof rec !== "object") {
        return { ok: false, error: `${path} must be an object` };
    }
    if (typeof rec.op !== "string" || !isNumericOp(rec.op)) {
        return { ok: false, error: `${path}.op must be one of lt|lte|gt|gte` };
    }
    if (!isFiniteNumber(rec.valueUsd)) {
        return { ok: false, error: `${path}.valueUsd must be a finite number` };
    }
    return {
        ok: true,
        value: {
            op: rec.op,
            valueUsd: rec.valueUsd,
        },
    };
}

function validateScreening(raw: unknown, path: string): { ok: true; value: ScreeningFilters } | { ok: false; error: string[] } {
    const errors: string[] = [];
    if (raw === undefined || raw === null) {
        return { ok: true, value: {} };
    }
    if (typeof raw !== "object") {
        return { ok: false, error: [`${path} must be an object`] };
    }
    const rec = raw as Partial<ScreeningFilters>;

    const out: ScreeningFilters = {};

    if (rec.fdv !== undefined) {
        const v = validateNumericFilter(rec.fdv, `${path}.fdv`);
        if (v.ok === true) out.fdv = v.value as ScreeningFilters["fdv"];
        else errors.push((v as { ok: false; error: string }).error);
    }
    if (rec.liquidityUsd !== undefined) {
        const v = validateNumericFilter(rec.liquidityUsd, `${path}.liquidityUsd`);
        if (v.ok === true)
            out.liquidityUsd = v.value as ScreeningFilters["liquidityUsd"];
        else errors.push((v as { ok: false; error: string }).error);
    }
    if (rec.volumeUsdH24 !== undefined) {
        const v = validateNumericFilter(rec.volumeUsdH24, `${path}.volumeUsdH24`);
        if (v.ok === true)
            out.volumeUsdH24 = v.value as ScreeningFilters["volumeUsdH24"];
        else errors.push((v as { ok: false; error: string }).error);
    }

    if (rec.priceChangeH24Pct !== undefined) {
        const v = rec.priceChangeH24Pct as Partial<{ op: unknown; valuePct: unknown }>;
        if (!v || typeof v !== "object") {
            errors.push(`${path}.priceChangeH24Pct must be an object`);
        } else {
            if (typeof v.op !== "string" || !isNumericOp(v.op)) {
                errors.push(`${path}.priceChangeH24Pct.op must be one of lt|lte|gt|gte`);
            }
            if (!isFiniteNumber(v.valuePct)) {
                errors.push(`${path}.priceChangeH24Pct.valuePct must be a finite number`);
            }
            if (errors.length === 0 && isFiniteNumber(v.valuePct)) {
                out.priceChangeH24Pct = {
                    op: v.op as NumericOp,
                    valuePct: v.valuePct,
                };
            }
        }
    }

    if (errors.length) return { ok: false, error: errors };
    return { ok: true, value: out };
}

/**
 * Validate AI-generated QuerySpec. Used to safely consume NLQ output.
 */
export function validateQuerySpecUnknown(raw: unknown): QuerySpecValidationResult {
    const errors: string[] = [];

    if (!raw || typeof raw !== "object") {
        return { ok: false, errors: ["spec must be an object"] };
    }
    const rec = raw as Partial<QuerySpec>;

    if (typeof rec.mode !== "string" || !isQueryMode(rec.mode)) {
        errors.push("spec.mode must be one of simple|filtering|wallet|security");
    }
    if (typeof rec.intent !== "string" || !isQueryIntent(rec.intent)) {
        errors.push("spec.intent must be tokenAddress|walletAddress|keyword|unknown");
    }

    if (rec.tokenAddress !== undefined) {
        if (typeof rec.tokenAddress !== "string" || rec.tokenAddress.trim().length < 5) {
            errors.push("spec.tokenAddress must be a non-empty string");
        }
    }
    if (rec.walletAddress !== undefined) {
        if (typeof rec.walletAddress !== "string" || rec.walletAddress.trim().length < 5) {
            errors.push("spec.walletAddress must be a non-empty string");
        }
    }
    if (rec.keyword !== undefined) {
        if (typeof rec.keyword !== "string" || rec.keyword.trim().length < 1) {
            errors.push("spec.keyword must be a non-empty string");
        }
    }

    let screening: ScreeningFilters | undefined;
    if (rec.screening !== undefined) {
        const v = validateScreening(rec.screening, "spec.screening");
        if (v.ok === false) {
            errors.push(...v.error);
        } else {
            screening = v.value;
        }
    }

    if (errors.length) return { ok: false, errors };

    const spec: QuerySpec = {
        mode: rec.mode as QueryMode,
        intent: rec.intent as QueryIntent,
        tokenAddress: rec.tokenAddress?.trim(),
        walletAddress: rec.walletAddress?.trim(),
        keyword: rec.keyword?.trim(),
        screening,
        security: rec.security,
        wallet: rec.wallet,
    };

    return { ok: true, spec };
}

