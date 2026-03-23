import { NextRequest, NextResponse } from "next/server";

const ALLOWED_BINANCE_LOGO_HOSTS = new Set(["bin.bnbstatic.com"]);
const REVALIDATE_SECONDS = 60 * 60 * 24 * 7;

function isAllowedBinanceLogoUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return (
            url.protocol === "https:" &&
            ALLOWED_BINANCE_LOGO_HOSTS.has(url.hostname)
        );
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    const sourceUrl = request.nextUrl.searchParams.get("url");

    if (!sourceUrl || !isAllowedBinanceLogoUrl(sourceUrl)) {
        return NextResponse.json(
            { error: "Invalid Binance logo URL" },
            { status: 400 },
        );
    }

    try {
        const response = await fetch(sourceUrl, {
            headers: {
                Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            },
            next: { revalidate: REVALIDATE_SECONDS },
        });

        if (!response.ok) {
            throw new Error(`Binance logo fetch failed: ${response.status}`);
        }

        const body = await response.arrayBuffer();
        const contentType =
            response.headers.get("content-type") ?? "application/octet-stream";
        const cacheControl =
            response.headers.get("cache-control") ??
            `public, max-age=${REVALIDATE_SECONDS}`;

        return new NextResponse(body, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": cacheControl,
            },
        });
    } catch (error) {
        console.error("[binanceLogoRoute] Failed to proxy Binance logo:", error);
        return NextResponse.json(
            { error: "Failed to load Binance logo" },
            { status: 502 },
        );
    }
}
