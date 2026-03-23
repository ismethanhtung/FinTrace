import { NextResponse } from "next/server";

const BINANCE_MARKETING_SYMBOLS_URL =
    "https://www.binance.com/bapi/composite/v1/public/marketing/symbol/list";
const REVALIDATE_SECONDS = 60 * 60 * 6;

type BinanceMarketingSymbolApiResponse = {
    data?: BinanceMarketingSymbolRow[];
};

type BinanceMarketingSymbolRow = {
    symbol?: string;
    baseAsset?: string;
    quoteAsset?: string;
    logo?: string;
    mapperName?: string;
    hidden?: number;
};

type BinanceMarketingSymbolPayload = {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    logo: string;
    mapperName?: string;
    hidden?: number;
};

function toPayload(
    rows: BinanceMarketingSymbolRow[] | undefined,
): BinanceMarketingSymbolPayload[] {
    if (!Array.isArray(rows)) return [];

    return rows
        .filter((row) => {
            return Boolean(row.symbol && row.baseAsset && row.logo);
        })
        .map((row) => ({
            symbol: row.symbol!.toUpperCase(),
            baseAsset: row.baseAsset!.toUpperCase(),
            quoteAsset: (row.quoteAsset ?? "").toUpperCase(),
            logo: row.logo!,
            mapperName: row.mapperName?.toUpperCase(),
            hidden: row.hidden,
        }));
}

export async function GET() {
    try {
        const response = await fetch(BINANCE_MARKETING_SYMBOLS_URL, {
            headers: {
                Accept: "application/json",
            },
            next: { revalidate: REVALIDATE_SECONDS },
        });

        if (!response.ok) {
            throw new Error(`Binance marketing API error: ${response.status}`);
        }

        const json =
            (await response.json()) as BinanceMarketingSymbolApiResponse;
        const data = toPayload(json.data);

        return NextResponse.json(data, {
            headers: {
                "Cache-Control": `s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS}`,
            },
        });
    } catch (error) {
        console.error(
            "[binanceMarketingSymbolsRoute] Failed to fetch marketing symbols:",
            error,
        );
        return NextResponse.json(
            { error: "Failed to load Binance marketing symbols" },
            { status: 502 },
        );
    }
}
