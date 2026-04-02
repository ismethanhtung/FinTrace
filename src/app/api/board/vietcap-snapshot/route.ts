import { NextRequest, NextResponse } from "next/server";

const VIETCAP_PRICEBOARD_URL =
    "https://trading.vietcap.com.vn/api/price/v1/w/priceboard/tickers/price/group";
const DEFAULT_GROUP = "VN30";
const REQUEST_TIMEOUT_MS = 12_000;

function sanitizeGroup(raw: string | null): string {
    const normalized = (raw || DEFAULT_GROUP).trim().toUpperCase();
    if (!/^[A-Z0-9_]{1,24}$/.test(normalized)) {
        return DEFAULT_GROUP;
    }
    return normalized;
}

export async function GET(request: NextRequest) {
    const group = sanitizeGroup(request.nextUrl.searchParams.get("group"));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch(VIETCAP_PRICEBOARD_URL, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                accept: "application/json",
            },
            body: JSON.stringify({ group }),
            cache: "no-store",
            signal: controller.signal,
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Vietcap API failed with status ${res.status}` },
                { status: 502 },
            );
        }

        const payload = await res.json();
        if (!Array.isArray(payload)) {
            return NextResponse.json(
                { error: "Invalid Vietcap payload (expected array)" },
                { status: 502 },
            );
        }

        return NextResponse.json(
            {
                group,
                fetchedAt: new Date().toISOString(),
                rows: payload,
            },
            {
                status: 200,
                headers: {
                    "cache-control": "no-store, max-age=0",
                },
            },
        );
    } catch (error) {
        const detail =
            error instanceof Error
                ? error.message
                : "Failed to fetch Vietcap snapshot";
        return NextResponse.json(
            { error: detail, group },
            {
                status: 502,
                headers: {
                    "cache-control": "no-store, max-age=0",
                },
            },
        );
    } finally {
        clearTimeout(timer);
    }
}

