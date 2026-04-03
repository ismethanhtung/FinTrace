import { NextResponse } from "next/server";
import {
    KB_SOURCE_SYMBOL_CANDIDATES,
    KB_UI_INDEX_SYMBOLS,
    resolveKbDefaultDateString,
    type KbUiIndexSymbol,
} from "../../../../lib/kb/indexIntraday";

const KB_INDEX_BASE_URL =
    "https://kbbuddywts.kbsec.com.vn/iis-server/investment/index";
const REQUEST_TIMEOUT_MS = 12_000;

type KbIntradayApiResponse = {
    symbol?: string;
    data_1P?: unknown;
};

function isKbUiIndexSymbol(value: string): value is KbUiIndexSymbol {
    return (KB_UI_INDEX_SYMBOLS as readonly string[]).includes(value);
}

function normalizeDateInput(value: string | null): string {
    if (value && /^\d{2}-\d{2}-\d{4}$/.test(value)) return value;
    return resolveKbDefaultDateString(new Date());
}

async function fetchBySourceSymbol(
    sourceSymbol: string,
    date: string,
): Promise<KbIntradayApiResponse | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const qs = new URLSearchParams({
            sdate: date,
            edate: date,
        });
        const url = `${KB_INDEX_BASE_URL}/${encodeURIComponent(sourceSymbol)}/data_1P?${qs.toString()}`;
        const res = await fetch(url, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
            headers: {
                accept: "application/json",
            },
        });
        if (!res.ok) return null;
        const payload = (await res.json()) as KbIntradayApiResponse;
        return payload;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const rawSymbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
    if (!isKbUiIndexSymbol(rawSymbol)) {
        return NextResponse.json(
            {
                error: "Invalid symbol. Supported: VNINDEX, VN30, HNX30, HNXINDEX, UPCOM",
            },
            { status: 400 },
        );
    }

    const date = normalizeDateInput(url.searchParams.get("date"));
    const candidates = KB_SOURCE_SYMBOL_CANDIDATES[rawSymbol];
    const errors: string[] = [];

    for (const candidate of candidates) {
        const payload = await fetchBySourceSymbol(candidate, date);
        if (!payload || !Array.isArray(payload.data_1P)) {
            errors.push(candidate);
            continue;
        }
        return NextResponse.json(
            {
                fetchedAt: new Date().toISOString(),
                uiSymbol: rawSymbol,
                sourceSymbol: candidate,
                date,
                rows: payload.data_1P,
            },
            {
                status: 200,
                headers: {
                    "cache-control": "no-store, max-age=0",
                },
            },
        );
    }

    return NextResponse.json(
        {
            error: `Failed to fetch KB intraday for ${rawSymbol}`,
            triedSources: errors,
        },
        {
            status: 502,
            headers: {
                "cache-control": "no-store, max-age=0",
            },
        },
    );
}
