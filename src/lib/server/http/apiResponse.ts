import { NextResponse } from "next/server";

export type ApiErrorCode =
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "CONFLICT"
    | "INVALID_INPUT"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR";

export function ok<T>(data: T, status = 200): NextResponse {
    return NextResponse.json(data, { status });
}

export function fail(
    status: number,
    error: string,
    code: ApiErrorCode,
    details?: unknown,
): NextResponse {
    return NextResponse.json(
        {
            error,
            code,
            ...(details === undefined ? {} : { details }),
        },
        { status },
    );
}
