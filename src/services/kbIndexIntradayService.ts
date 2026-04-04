import {
    mapKbIntradayRowsToPoints,
    resolveKbDefaultDateString,
    toKbApiDateString,
    type KbIntradaySeries,
    type KbUiIndexSymbol,
} from "../lib/kb/indexIntraday";

type KbIntradayApiResponse = {
    fetchedAt?: string;
    uiSymbol?: string;
    sourceSymbol?: string;
    date?: string;
    rows?: unknown;
    error?: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LOOKBACK_DAYS = 7;

function parseKbDateString(value: string): Date | null {
    const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return null;
    const day = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const year = Number.parseInt(match[3], 10);
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
        return null;
    }
    return new Date(Date.UTC(year, month - 1, day));
}

function toKbApiDateStringUtc(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
}

async function fetchKbIntradayPayload(
    uiSymbol: KbUiIndexSymbol,
    dateParam: string,
): Promise<KbIntradayApiResponse> {
    const qs = new URLSearchParams({ symbol: uiSymbol, date: dateParam });
    const res = await fetch(`/api/board/kb-index-intraday?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
    });
    const payload = (await res.json()) as KbIntradayApiResponse;
    if (!res.ok) {
        throw new Error(payload?.error || `KB intraday API error: ${res.status}`);
    }
    return payload;
}

export const kbIndexIntradayService = {
    async getSeries(
        uiSymbol: KbUiIndexSymbol,
        date?: Date,
    ): Promise<KbIntradaySeries> {
        if (date) {
            const payload = await fetchKbIntradayPayload(
                uiSymbol,
                toKbApiDateString(date),
            );
            const points = mapKbIntradayRowsToPoints(payload.rows);
            return {
                uiSymbol,
                sourceSymbol:
                    typeof payload.sourceSymbol === "string" &&
                    payload.sourceSymbol.trim()
                        ? payload.sourceSymbol.trim().toUpperCase()
                        : uiSymbol,
                points,
            };
        }

        const baseDateString = resolveKbDefaultDateString(new Date());
        const baseDate = parseKbDateString(baseDateString);
        const startUtcDate =
            baseDate ?? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));

        let lastError: Error | null = null;
        let lastPayload: KbIntradayApiResponse | null = null;

        for (let offset = 0; offset < MAX_LOOKBACK_DAYS; offset++) {
            const candidateDate = new Date(startUtcDate.getTime() - offset * ONE_DAY_MS);
            const dateParam = toKbApiDateStringUtc(candidateDate);
            try {
                const payload = await fetchKbIntradayPayload(uiSymbol, dateParam);
                lastPayload = payload;
                const points = mapKbIntradayRowsToPoints(payload.rows);
                if (!points.length) {
                    continue;
                }
                return {
                    uiSymbol,
                    sourceSymbol:
                        typeof payload.sourceSymbol === "string" &&
                        payload.sourceSymbol.trim()
                            ? payload.sourceSymbol.trim().toUpperCase()
                            : uiSymbol,
                    points,
                };
            } catch (error) {
                lastError =
                    error instanceof Error
                        ? error
                        : new Error("Failed to fetch KB intraday");
            }
        }

        if (lastPayload) {
            return {
                uiSymbol,
                sourceSymbol:
                    typeof lastPayload.sourceSymbol === "string" &&
                    lastPayload.sourceSymbol.trim()
                        ? lastPayload.sourceSymbol.trim().toUpperCase()
                        : uiSymbol,
                points: mapKbIntradayRowsToPoints(lastPayload.rows),
            };
        }

        if (lastError) {
            throw lastError;
        }

        throw new Error("Failed to fetch KB intraday");
    },
};
