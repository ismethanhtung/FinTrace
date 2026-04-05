import { NextRequest, NextResponse } from "next/server";

type AltcoinSeasonPoint = {
    name?: string;
    altcoinIndex?: string;
    altcoinMarketcap?: string;
    timestamp?: string;
};

type AltcoinSeasonResponse = {
    data?: {
        points?: AltcoinSeasonPoint[];
        historicalValues?: {
            now?: AltcoinSeasonPoint;
            yesterday?: AltcoinSeasonPoint;
            lastWeek?: AltcoinSeasonPoint;
            lastMonth?: AltcoinSeasonPoint;
            yearlyHigh?: AltcoinSeasonPoint;
            yearlyLow?: AltcoinSeasonPoint;
        };
        dialConfigs?: Array<{
            start?: number;
            end?: number;
            name?: string;
        }>;
    };
    status?: {
        timestamp?: string;
    };
};

const ALTCOIN_SEASON_URL =
    "https://api.coinmarketcap.com/data-api/v3/altcoin-season/chart";
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_DAYS = 45;

function safeInt(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeWindow(searchParams: URLSearchParams) {
    const nowSec = Math.floor(Date.now() / 1000);
    const end = safeInt(searchParams.get("end")) ?? nowSec;
    const days = Math.max(
        7,
        Math.min(365, safeInt(searchParams.get("days")) ?? DEFAULT_DAYS),
    );
    const start = safeInt(searchParams.get("start")) ?? end - days * 24 * 60 * 60;
    return {
        start: Math.min(start, end - 3600),
        end: Math.max(end, start + 3600),
    };
}

export async function GET(request: NextRequest) {
    const { start, end } = normalizeWindow(request.nextUrl.searchParams);
    const upstream = `${ALTCOIN_SEASON_URL}?start=${start}&end=${end}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch(upstream, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
        });
        if (!res.ok) {
            throw new Error(`Altcoin season upstream error: ${res.status}`);
        }

        const payload = (await res.json()) as AltcoinSeasonResponse;
        const rawPoints = payload.data?.points ?? [];
        const points = rawPoints
            .map((point) => {
                const ts = Number.parseInt(String(point.timestamp ?? ""), 10);
                const index = Number(point.altcoinIndex ?? NaN);
                if (!Number.isFinite(ts) || !Number.isFinite(index)) return null;
                return {
                    timestamp: ts,
                    index,
                    name: String(point.name ?? ""),
                    altcoinMarketcap: Number(point.altcoinMarketcap ?? NaN),
                };
            })
            .filter((point): point is NonNullable<typeof point> => Boolean(point))
            .sort((a, b) => a.timestamp - b.timestamp);

        return NextResponse.json(
            {
                updatedAt: payload.status?.timestamp ?? new Date().toISOString(),
                points,
                dialConfigs: payload.data?.dialConfigs ?? [],
                historical: payload.data?.historicalValues ?? {},
            },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
                },
            },
        );
    } catch (error) {
        return NextResponse.json(
            {
                updatedAt: new Date().toISOString(),
                points: [],
                dialConfigs: [],
                historical: {},
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to load altcoin season data",
            },
            { status: 200 },
        );
    } finally {
        clearTimeout(timer);
    }
}
