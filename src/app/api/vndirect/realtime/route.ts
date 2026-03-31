import { NextRequest, NextResponse } from "next/server";

type RealtimeCmdAlias = "status" | "snapshot" | "subscribe";

const DEFAULT_UPSTREAM_BASE = "http://127.0.0.1:18000";
const CMD_ALIAS_MAP: Record<RealtimeCmdAlias, string> = {
    status: "vndirect_realtime_status",
    snapshot: "vndirect_realtime_snapshot",
    subscribe: "vndirect_realtime_subscribe",
};

function resolveUpstreamBase(): string {
    const configured =
        process.env.VNDIRECT_REALTIME_API_BASE_URL?.trim() ||
        process.env.NEXT_PUBLIC_STOCK_LAMBDA_URL?.trim() ||
        "";
    if (!configured || configured.startsWith("/")) {
        return DEFAULT_UPSTREAM_BASE;
    }
    return configured.replace(/\/+$/, "");
}

function normalizeCmd(input: string | null): string {
    const raw = String(input || "status")
        .trim()
        .toLowerCase();
    if (raw in CMD_ALIAS_MAP) {
        return CMD_ALIAS_MAP[raw as RealtimeCmdAlias];
    }
    if (/^vndirect_realtime_(status|snapshot|subscribe)$/.test(raw)) {
        return raw;
    }
    return CMD_ALIAS_MAP.status;
}

function buildUpstreamUrl(req: NextRequest): string {
    const base = resolveUpstreamBase();
    const query = new URLSearchParams(req.nextUrl.searchParams);
    const cmd = normalizeCmd(query.get("cmd"));
    query.set("cmd", cmd);
    return `${base}/?${query.toString()}`;
}

export async function GET(req: NextRequest) {
    const upstreamUrl = buildUpstreamUrl(req);
    const startedAt = Date.now();

    try {
        const response = await fetch(upstreamUrl, {
            cache: "no-store",
            headers: {
                accept: "application/json",
            },
        });

        const text = await response.text();
        let parsed: unknown = null;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch {
            parsed = {
                raw: text,
            };
        }

        return NextResponse.json(
            {
                ok: response.ok,
                status: response.status,
                upstream_url: upstreamUrl,
                elapsed_ms: Date.now() - startedAt,
                data: parsed,
            },
            { status: response.ok ? 200 : response.status },
        );
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                status: 502,
                upstream_url: upstreamUrl,
                elapsed_ms: Date.now() - startedAt,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to call upstream realtime API",
            },
            { status: 502 },
        );
    }
}
