import { NextResponse } from "next/server";

const VIETCAP_MARKET_INDEX_URL =
    "https://trading.vietcap.com.vn/api/price/marketIndex/getList";
const REQUEST_TIMEOUT_MS = 12_000;
const DEFAULT_SYMBOLS = [
    "VNINDEX",
    "VN30",
    "HNXIndex",
    "HNX30",
    "HNXUpcomIndex",
    "VNXALL",
];

export async function GET() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch(VIETCAP_MARKET_INDEX_URL, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                accept: "application/json",
            },
            body: JSON.stringify({ symbols: DEFAULT_SYMBOLS }),
            cache: "no-store",
            signal: controller.signal,
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Vietcap market index API failed with ${res.status}` },
                { status: 502 },
            );
        }

        const payload = await res.json();
        if (!Array.isArray(payload)) {
            return NextResponse.json(
                { error: "Invalid market index payload (expected array)" },
                { status: 502 },
            );
        }

        return NextResponse.json(
            {
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
                : "Failed to fetch market index data";
        return NextResponse.json(
            { error: detail },
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
