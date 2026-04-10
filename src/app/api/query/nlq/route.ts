import { NextResponse } from "next/server";
import { getOpenRouterApiKey } from "../../../../lib/getOpenRouterKey";
import type {
    QuerySpec,
    QuerySpecValidationResult,
    NumericFilter,
    NumericOp,
    ScreeningFilters,
} from "../../../../lib/queryEngine/types";
import { validateQuerySpecUnknown } from "../../../../lib/queryEngine/validateQuerySpec";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

type Role = "system" | "user" | "assistant";
type ChatMessage = { role: Role; content: string };

function parseJsonObjectFromText(text: string): unknown {
    // Support: plain JSON or wrapped in ```json ... ```
    const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

    // Some models may add prefix/suffix; extract the first {...} block.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        throw new Error("NLQ: cannot find JSON object in model output");
    }
    return JSON.parse(cleaned.slice(start, end + 1));
}

function buildPrompt(): ChatMessage[] {
    const system = [
        "Bạn là FinTrace Query Engine.",
        "Hãy chuyển câu người dùng (Natural Language Query) sang một JSON spec đúng schema.",
        "QUY TẮC QUAN TRỌNG:",
        "- Chỉ trả về JSON (không markdown, không giải thích).",
        "- Nếu người dùng không yêu cầu screening, vẫn điền mode phù hợp và bỏ screening.",
        "- Nếu người dùng nhắc tới contract/token address, hãy đặt intent=tokenAddress và điền tokenAddress (string).",
        "- Nếu người dùng nhắc tới ví (wallet), hãy đặt intent=walletAddress và điền walletAddress.",
        "- Nếu câu mơ hồ, dùng intent=unknown và để tokenAddress/walletAddress trống.",
        "",
        "Schema JSON (chỉ dùng các field bên dưới):",
        "{",
        '  "mode": "simple" | "filtering" | "wallet" | "security",',
        '  "intent": "tokenAddress" | "walletAddress" | "keyword" | "unknown",',
        '  "tokenAddress"?: string,',
        '  "walletAddress"?: string,',
        '  "keyword"?: string,',
        '  "screening"?: {',
        '    "fdv"?: { "op": "lt" | "lte" | "gt" | "gte", "valueUsd": number },',
        '    "liquidityUsd"?: { "op": "lt" | "lte" | "gt" | "gte", "valueUsd": number },',
        '    "volumeUsdH24"?: { "op": "lt" | "lte" | "gt" | "gte", "valueUsd": number },',
        '    "priceChangeH24Pct"?: { "op": "lt" | "lte" | "gt" | "gte", "valuePct": number }',
        "  },",
        '  "security"?: {',
        '    "scanHoneypot"?: boolean,',
        '    "scanLiquidityLock"?: boolean,',
        '    "scanDevHoldings"?: boolean',
        "  },",
        '  "wallet"?: {',
        '    "pnl"?: boolean,',
        '    "portfolio"?: boolean,',
        '    "recentActivity"?: boolean',
        "  }",
        "}",
    ].join("\n");

    return [
        { role: "system", content: system },
        {
            role: "user",
            content:
                "Người dùng: (Nội dung dưới đây)\n",
        },
    ];
}

function guessFallbackSpecFromText(text: string, mode: "simple" | "filtering" | "wallet" | "security"): QuerySpec {
    const trimmed = text.trim();
    const evmMatch = trimmed.match(/0x[a-fA-F0-9]{40,64}/);
    const walletMatch = evmMatch?.[0];

    if (mode === "wallet" && walletMatch) {
        return { mode, intent: "walletAddress", walletAddress: walletMatch };
    }
    if (mode !== "wallet" && evmMatch) {
        return { mode, intent: "tokenAddress", tokenAddress: evmMatch[0] };
    }

    // Default keyword intent (v1: we don't have keyword->universe yet)
    return { mode, intent: "keyword", keyword: trimmed.slice(0, 120) };
}

function extractFirstEvmAddress(text: string): string | null {
    const m = text.match(/0x[a-fA-F0-9]{40,64}/);
    return m?.[0] ?? null;
}

function parseUsdNumberWithSuffix(raw: string): number | null {
    const t = raw.trim().replace(/,/g, "");
    const m = t.match(/^(-?\d+(?:\.\d+)?)([kKmMbB])?$/);
    if (!m) return null;
    const num = Number(m[1]);
    if (!Number.isFinite(num)) return null;
    const sfx = m[2]?.toLowerCase();
    if (!sfx) return num;
    if (sfx === "k") return num * 1_000;
    if (sfx === "m") return num * 1_000_000;
    if (sfx === "b") return num * 1_000_000_000;
    return null;
}

function normalizeOp(op: string): NumericOp | null {
    const t = op.trim();
    if (t === "<") return "lt";
    if (t === "<=") return "lte";
    if (t === ">") return "gt";
    if (t === ">=") return "gte";
    return null;
}

function parseNumericFilterFromFdOrMcap(text: string): NumericFilter | null {
    const t = text.toLowerCase();

    // 1) Symbol operators first: FDV < 50M, market cap <= 1.2B, ...
    const m1 = t.match(/(?:fdv|market\s*cap|mcap)\s*(<=|>=|<|>)\s*([\d.,]+)\s*([kmb])\b/i);
    if (m1) {
        const op = normalizeOp(m1[1]);
        const value = parseUsdNumberWithSuffix(`${m1[2]}${m1[3]}`);
        if (op && value !== null) return { op, valueUsd: value };
    }

    // 2) Vietnamese phrasing: "fdv thấp hơn 50M"
    const m2 = t.match(
        /(?:fdv|market\s*cap|mcap)\s*(dưới|thấp\s*hơn|nhỏ\s*hơn)\s*([\d.,]+)\s*([kmb])\b/i,
    );
    if (m2) {
        const value = parseUsdNumberWithSuffix(`${m2[2]}${m2[3]}`);
        if (value !== null) return { op: "lt", valueUsd: value };
    }

    const m3 = t.match(
        /(?:fdv|market\s*cap|mcap)\s*(không\s*quá|tối\s*đa)\s*([\d.,]+)\s*([kmb])\b/i,
    );
    if (m3) {
        const value = parseUsdNumberWithSuffix(`${m3[2]}${m3[3]}`);
        if (value !== null) return { op: "lte", valueUsd: value };
    }

    const m4 = t.match(
        /(?:fdv|market\s*cap|mcap)\s*(ít\s*nhất|tối\s*thiểu|>=)\s*([\d.,]+)\s*([kmb])\b/i,
    );
    if (m4) {
        const value = parseUsdNumberWithSuffix(`${m4[2]}${m4[3]}`);
        if (value !== null) return { op: "gte", valueUsd: value };
    }

    return null;
}

function parseScreeningFiltersHeuristic(text: string): ScreeningFilters | null {
    const filters: ScreeningFilters = {};
    const fdv = parseNumericFilterFromFdOrMcap(text);
    if (fdv) filters.fdv = fdv;

    // v1: only implement FDV heuristic deterministically for now.
    // (Liquidity/Volume heuristics can be added when you confirm desired patterns.)
    return Object.keys(filters).length ? filters : null;
}

function applyHeuristicScreeningToSpec(args: {
    spec: QuerySpec;
    text: string;
}): QuerySpec {
    const { spec, text } = args;
    const parsedFd = parseScreeningFiltersHeuristic(text);
    const addr = extractFirstEvmAddress(text);

    if (!parsedFd) {
        // Still fill tokenAddress if missing but the user provided one.
        if (!spec.tokenAddress && addr) {
            return { ...spec, intent: "tokenAddress", tokenAddress: addr };
        }
        return spec;
    }

    const next: QuerySpec = {
        ...spec,
        mode: "filtering",
        intent: addr ? "tokenAddress" : spec.intent,
        tokenAddress: addr ? addr : spec.tokenAddress,
        screening: {
            ...(spec.screening ?? {}),
            ...parsedFd,
        },
    };

    return next;
}


/**
 * POST /api/query/nlq
 * Translate Natural Language Query -> QuerySpec JSON.
 */
export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rec = body as Partial<{
        text: string;
        mode: "simple" | "filtering" | "wallet" | "security";
        provider: "openrouter" | "groq" | "huggingface";
        model: string;
    }>;

    const text = typeof rec.text === "string" ? rec.text.trim() : "";
    const mode = rec.mode ?? "simple";
    const model = typeof rec.model === "string" && rec.model.trim() ? rec.model.trim() : "arcee-ai/trinity-large-preview:free";
    const provider = rec.provider ?? "openrouter";

    if (!text) {
        return NextResponse.json({ error: "Missing `text`" }, { status: 400 });
    }

    if (provider !== "openrouter") {
        const specFallback = guessFallbackSpecFromText(text, mode);
        const validated: QuerySpecValidationResult = validateQuerySpecUnknown(specFallback);
        if (validated.ok) {
            return NextResponse.json({ spec: validated.spec, fallback: true });
        }
        return NextResponse.json({ error: "NLQ: cannot validate fallback spec" }, { status: 400 });
    }

    const apiKey = (() => {
        // OpenRouter key resolver (env/AWS) with consistent repo behavior.
        // If key is missing, we fallback to heuristic spec rather than hard-fail.
        return getOpenRouterApiKey();
    })();

    try {
        const resolvedKey = await apiKey;

        const messages: ChatMessage[] = [
            {
                role: "system",
                content: buildPrompt()[0].content,
            },
            {
                role: "user",
                content: `Người dùng: ${text}\n\nHãy trả về JSON spec theo schema.`,
            },
        ];

        const res = await fetch(OPENROUTER_CHAT_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${resolvedKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://fintrace.app",
                "X-Title": "FinTrace AI",
            },
            body: JSON.stringify({
                model,
                messages,
                stream: false,
                max_tokens: 600,
            }),
        });

        if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            const specFallback = guessFallbackSpecFromText(text, mode);
            const validated: QuerySpecValidationResult = validateQuerySpecUnknown(specFallback);
            if (validated.ok) {
                return NextResponse.json({
                    spec: validated.spec,
                    fallback: true,
                    warning: `NLQ provider error (${res.status}): ${errBody.slice(0, 200)}`,
                });
            }
            return NextResponse.json(
                { error: "NLQ provider error and fallback validation failed" },
                { status: 502 },
            );
        }

        const json: unknown = await res.json();
        const content = (json as any)?.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
            const specFallback = guessFallbackSpecFromText(text, mode);
            const validated: QuerySpecValidationResult = validateQuerySpecUnknown(specFallback);
            if (validated.ok) {
                return NextResponse.json({ spec: validated.spec, fallback: true, warning: "NLQ: missing model content" });
            }
            return NextResponse.json({ error: "NLQ: missing model output" }, { status: 502 });
        }

        const parsed = parseJsonObjectFromText(content);
        const validated: QuerySpecValidationResult = validateQuerySpecUnknown(parsed);
        if (validated.ok === false) {
            const validationErrors = validated.errors;
            const specFallback = guessFallbackSpecFromText(text, mode);
            const validatedFallback: QuerySpecValidationResult = validateQuerySpecUnknown(specFallback);
            if (validatedFallback.ok) {
                return NextResponse.json({
                    spec: validatedFallback.spec,
                    fallback: true,
                    warning: `NLQ: validation failed, used fallback: ${validationErrors.join("; ").slice(0, 200)}`,
                });
            }
            return NextResponse.json(
                { error: "NLQ: spec validation failed", details: validationErrors },
                { status: 400 },
            );
        }

        const heuristicPatched = applyHeuristicScreeningToSpec({
            spec: validated.spec,
            text,
        });
        const revalidated = validateQuerySpecUnknown(heuristicPatched);
        if (!revalidated.ok) {
            // Keep original AI spec when heuristic patch breaks validation.
            return NextResponse.json({ spec: validated.spec, fallback: false });
        }

        return NextResponse.json({ spec: revalidated.spec, fallback: false });
    } catch (err: unknown) {
        const specFallback = guessFallbackSpecFromText(text, mode);
        const validated: QuerySpecValidationResult = validateQuerySpecUnknown(specFallback);
        if (!validated.ok) {
            return NextResponse.json({ error: "NLQ: fallback spec validation failed" }, { status: 500 });
        }

        return NextResponse.json({
            spec: validated.spec,
            fallback: true,
            warning: err instanceof Error ? err.message : "NLQ: unknown error",
        });
    }
}

