import type { QuerySpec } from "../lib/queryEngine/types";
import type { DexScreenerPair } from "./dexScreenerService";
import { searchTokenPairsAcrossChains } from "./dexScreenerService";

type AppliedNumericFilter = {
    field: "fdv" | "liquidityUsd" | "volumeUsdH24";
    op: "lt" | "lte" | "gt" | "gte";
    valueUsd: number;
};

export type QueryEngineResult = {
    mode: QuerySpec["mode"];
    intent: QuerySpec["intent"];
    tokenAddress?: string;
    matches: Array<{
        pair: DexScreenerPair;
        chainId: string;
        pairAddress: string;
        // Derived "best" metric keys for UI ordering
        bestScore: number;
    }>;
    filteredCount: number;
    totalCandidateCount: number;
    appliedFilters: AppliedNumericFilter[];
    warnings: string[];
};

function satisfiesOp(args: {
    op: "lt" | "lte" | "gt" | "gte";
    left: number;
    right: number;
}): boolean {
    const { op, left, right } = args;
    switch (op) {
        case "lt":
            return left < right;
        case "lte":
            return left <= right;
        case "gt":
            return left > right;
        case "gte":
            return left >= right;
        default:
            return true;
    }
}

function getPairFieldValue(pair: DexScreenerPair, field: AppliedNumericFilter["field"]): number | null {
    if (field === "fdv") return pair.marketCapUsd ?? pair.fdvUsd ?? null;
    if (field === "liquidityUsd") return pair.liquidityUsd ?? null;
    if (field === "volumeUsdH24") return pair.volumeUsdH24 ?? null;
    return null;
}

function computeBestScore(pair: DexScreenerPair): number {
    const liquidity = pair.liquidityUsd ?? 0;
    const volume = pair.volumeUsdH24 ?? 0;
    const priceDelta = pair.priceChangeH24Pct ?? 0;

    // Simple scoring heuristic: liquidity dominates, volume is secondary,
    // and price-change is a mild momentum factor.
    return liquidity * 1.0 + volume * 0.15 + Math.abs(priceDelta) * 1000;
}

/**
 * Execute v1 Query Engine:
 * - Cross-chain search (tokenAddress -> DexScreener pairs)
 * - Optional screening filters applied on top of candidates
 */
export async function executeQueryV1(spec: QuerySpec): Promise<QueryEngineResult> {
    const warnings: string[] = [];

    if (!spec.tokenAddress) {
        warnings.push(
            "V1 Screening/Cross-chain cần `tokenAddress` để tạo candidate set. Hãy dán contract/token address (keyword-universe sẽ được mở rộng ở version sau).",
        );
        return {
            mode: spec.mode,
            intent: spec.intent,
            tokenAddress: undefined,
            matches: [],
            filteredCount: 0,
            totalCandidateCount: 0,
            appliedFilters: [],
            warnings,
        };
    }

    const dex = await searchTokenPairsAcrossChains({
        tokenAddress: spec.tokenAddress,
        limit: 50,
    });

    const totalCandidateCount = dex.pairs.length;

    const appliedFilters: AppliedNumericFilter[] = [];
    const filters = spec.screening;
    if (spec.mode === "filtering" && filters) {
        if (filters.fdv) appliedFilters.push({ field: "fdv", op: filters.fdv.op, valueUsd: filters.fdv.valueUsd });
        if (filters.liquidityUsd) appliedFilters.push({ field: "liquidityUsd", op: filters.liquidityUsd.op, valueUsd: filters.liquidityUsd.valueUsd });
        if (filters.volumeUsdH24) appliedFilters.push({ field: "volumeUsdH24", op: filters.volumeUsdH24.op, valueUsd: filters.volumeUsdH24.valueUsd });
    }

    let candidatePairs = dex.pairs;
    if (spec.mode === "filtering" && filters && appliedFilters.length) {
        candidatePairs = candidatePairs.filter((p) => {
            for (const f of appliedFilters) {
                const left = getPairFieldValue(p, f.field);
                if (left === null) return false;
                if (!satisfiesOp({ op: f.op, left, right: f.valueUsd })) return false;
            }

            // priceChangeH24Pct is optional / separate
            if (filters.priceChangeH24Pct) {
                const pc = p.priceChangeH24Pct;
                if (pc === null) return false;
                if (!satisfiesOp({ op: filters.priceChangeH24Pct.op, left: pc, right: filters.priceChangeH24Pct.valuePct })) {
                    return false;
                }
            }

            return true;
        });
    } else {
        if (spec.mode === "filtering" && !filters) {
            warnings.push("Filtering mode selected but screening.filters is missing; returning unfiltered candidates");
        }
    }

    const matches = candidatePairs
        .slice()
        .sort((a, b) => computeBestScore(b) - computeBestScore(a))
        .map((pair) => ({
            pair,
            chainId: pair.chainId,
            pairAddress: pair.pairAddress,
            bestScore: computeBestScore(pair),
        }));

    const filteredCount = candidatePairs.length;

    return {
        mode: spec.mode,
        intent: spec.intent,
        tokenAddress: spec.tokenAddress,
        matches,
        filteredCount,
        totalCandidateCount,
        appliedFilters,
        warnings,
    };
}

