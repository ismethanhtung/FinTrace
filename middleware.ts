import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const UNIVERSE_COOKIE_KEY = "ft-asset-universe";

export function middleware(request: NextRequest) {
    const universeCookie = request.cookies.get(UNIVERSE_COOKIE_KEY)?.value;
    const universe = universeCookie === "stock" ? "stock" : "coin";
    const { pathname } = request.nextUrl;

    if (pathname === "/market" && universe === "stock") {
        const url = request.nextUrl.clone();
        url.pathname = "/board";
        return NextResponse.redirect(url);
    }

    if (pathname === "/board" && universe === "coin") {
        const url = request.nextUrl.clone();
        url.pathname = "/market";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/market", "/board"],
};
