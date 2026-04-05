import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
    detectLocaleFromAcceptLanguage,
    LOCALE_COOKIE_KEY,
} from "./src/i18n/config";

const UNIVERSE_COOKIE_KEY = "ft-asset-universe";

function withLocaleCookie(request: NextRequest, response: NextResponse) {
    const localeCookie = request.cookies.get(LOCALE_COOKIE_KEY)?.value;
    if (localeCookie) {
        return response;
    }

    const locale = detectLocaleFromAcceptLanguage(
        request.headers.get("accept-language"),
    );

    response.cookies.set(LOCALE_COOKIE_KEY, locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
    });
    return response;
}

export function middleware(request: NextRequest) {
    const universeCookie = request.cookies.get(UNIVERSE_COOKIE_KEY)?.value;
    const universe = universeCookie === "stock" ? "stock" : "coin";
    const { pathname } = request.nextUrl;

    if (pathname === "/market" && universe === "stock") {
        const url = request.nextUrl.clone();
        url.pathname = "/board";
        return withLocaleCookie(request, NextResponse.redirect(url));
    }

    if (pathname === "/board" && universe === "coin") {
        const url = request.nextUrl.clone();
        url.pathname = "/market";
        return withLocaleCookie(request, NextResponse.redirect(url));
    }

    return withLocaleCookie(request, NextResponse.next());
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
