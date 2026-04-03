import {
    mapKbIntradayRowsToPoints,
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

export const kbIndexIntradayService = {
    async getSeries(
        uiSymbol: KbUiIndexSymbol,
        date: Date = new Date(),
    ): Promise<KbIntradaySeries> {
        const dateParam = toKbApiDateString(date);
        const qs = new URLSearchParams({ symbol: uiSymbol, date: dateParam });
        const res = await fetch(`/api/board/kb-index-intraday?${qs.toString()}`, {
            method: "GET",
            cache: "no-store",
        });
        const payload = (await res.json()) as KbIntradayApiResponse;
        if (!res.ok) {
            throw new Error(
                payload?.error || `KB intraday API error: ${res.status}`,
            );
        }

        const points = mapKbIntradayRowsToPoints(payload.rows);
        return {
            uiSymbol,
            sourceSymbol:
                typeof payload.sourceSymbol === "string" && payload.sourceSymbol.trim()
                    ? payload.sourceSymbol.trim().toUpperCase()
                    : uiSymbol,
            points,
        };
    },
};
