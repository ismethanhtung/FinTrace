import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
    getDnsePresetOperation,
    type DnsePresetOperation,
} from "../../../../../lib/dnse/openapiCatalog";


type JsonRecord = Record<string, unknown>;

type ExecutePresetRequest = {
    mode: "preset";
    operation: string;
    pathParams?: Record<string, string | number | boolean>;
    query?: Record<string, string | number | boolean>;
    body?: unknown;
    tradingToken?: string;
    dryRun?: boolean;
};

type ExecuteCustomRequest = {
    mode: "custom";
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    query?: Record<string, string | number | boolean>;
    body?: unknown;
    headers?: Record<string, string>;
    dryRun?: boolean;
};

type ExecuteRequest = ExecutePresetRequest | ExecuteCustomRequest;

type PreparedRequest = {
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    query: Record<string, string | number | boolean>;
    body: unknown;
    headers: Record<string, string>;
};

const DEFAULT_REST_BASE_URL = "https://openapi.dnse.com.vn";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

function asRecord(value: unknown): JsonRecord | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as JsonRecord)
        : null;
}

function readString(value: unknown, fallback = ""): string {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toHttpMethod(value: unknown): "GET" | "POST" | "PUT" | "DELETE" {
    const method = readString(value, "GET").toUpperCase();
    if (method === "POST" || method === "PUT" || method === "DELETE") {
        return method;
    }
    return "GET";
}

function ensureLeadingSlash(path: string): string {
    const safe = `/${path.trim()}`.replace(/\/+/g, "/");
    return safe.startsWith("/") ? safe : `/${safe}`;
}

function parseRecordValue(
    value: unknown,
): Record<string, string | number | boolean> {
    const record = asRecord(value);
    if (!record) return {};
    const out: Record<string, string | number | boolean> = {};
    for (const [key, raw] of Object.entries(record)) {
        if (raw == null) continue;
        if (
            typeof raw === "string" ||
            typeof raw === "number" ||
            typeof raw === "boolean"
        ) {
            out[key] = raw;
        } else {
            out[key] = JSON.stringify(raw);
        }
    }
    return out;
}

function applyPathTemplate(
    template: string,
    values: Record<string, string | number | boolean>,
): string {
    return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
        const value = values[key];
        if (value == null) return `{${key}}`;
        return encodeURIComponent(String(value));
    });
}

function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

function formatDateHeader(date: Date): string {
    const dayName = DAY_NAMES[date.getUTCDay()];
    const day = pad2(date.getUTCDate());
    const month = MONTH_NAMES[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    const hours = pad2(date.getUTCHours());
    const minutes = pad2(date.getUTCMinutes());
    const seconds = pad2(date.getUTCSeconds());
    return `${dayName}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
}

function buildSignature(
    secret: string,
    method: string,
    path: string,
    dateValue: string,
    nonce: string,
): string {
    let signatureString = `(request-target): ${method.toLowerCase()} ${path}\n`;
    signatureString += `date: ${dateValue}`;
    if (nonce) {
        signatureString += `\nnonce: ${nonce}`;
    }

    const hmac = crypto.createHmac("sha256", Buffer.from(secret, "utf8"));
    hmac.update(signatureString, "utf8");
    const encoded = hmac.digest("base64");
    return encodeURIComponent(encoded);
}

function parseMaybeJson(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function resolveRestBaseUrl(): string {
    const envBase = readString(process.env.DNSE_REST_BASE_URL, "");
    return (envBase || DEFAULT_REST_BASE_URL).replace(/\/+$/, "");
}

function requiredEnv(name: string): string {
    const value = readString(process.env[name], "");
    if (!value) {
        throw new Error(`Missing ${name} in server environment`);
    }
    return value;
}

function ensurePresetFields(
    op: DnsePresetOperation,
    pathParams: Record<string, string | number | boolean>,
    query: Record<string, string | number | boolean>,
    body: unknown,
): string[] {
    const errors: string[] = [];
    for (const field of op.pathFields ?? []) {
        if (!field.required) continue;
        if (pathParams[field.key] == null || String(pathParams[field.key]) === "") {
            errors.push(`Missing required path field: ${field.key}`);
        }
    }
    for (const field of op.queryFields ?? []) {
        if (!field.required) continue;
        if (query[field.key] == null || String(query[field.key]) === "") {
            errors.push(`Missing required query field: ${field.key}`);
        }
    }
    if ((op.bodyFields ?? []).some((field) => field.required)) {
        const record = asRecord(body);
        if (!record) {
            errors.push("Missing required request body object");
        } else {
            for (const field of op.bodyFields ?? []) {
                if (!field.required) continue;
                if (record[field.key] == null || record[field.key] === "") {
                    errors.push(`Missing required body field: ${field.key}`);
                }
            }
        }
    }
    return errors;
}

function normalizePresetRequest(
    body: ExecutePresetRequest,
): PreparedRequest | { errors: string[] } {
    const op = getDnsePresetOperation(readString(body.operation, ""));
    if (!op) return { errors: ["Unknown preset operation"] };

    const pathParams = parseRecordValue(body.pathParams);
    const query = parseRecordValue(body.query);
    const path = applyPathTemplate(op.pathTemplate, pathParams);
    const normalizedBody =
        body.body == null
            ? {}
            : typeof body.body === "string"
              ? (parseMaybeJson(body.body) ?? body.body)
              : body.body;

    const errors = ensurePresetFields(op, pathParams, query, normalizedBody);
    if (errors.length) return { errors };

    const headers: Record<string, string> = {};
    if (op.requiresTradingToken) {
        const tradingToken = readString(body.tradingToken, "");
        if (!tradingToken) {
            return { errors: ["Missing trading token for this operation"] };
        }
        headers["trading-token"] = tradingToken;
    }

    let requestBody: unknown = undefined;
    if (op.method !== "GET" && op.method !== "DELETE") {
        requestBody = normalizedBody;
    }

    return {
        method: op.method,
        path,
        query,
        body: requestBody,
        headers,
    };
}

function normalizeCustomRequest(
    body: ExecuteCustomRequest,
): PreparedRequest | { errors: string[] } {
    const path = ensureLeadingSlash(readString(body.path, "/"));
    const query = parseRecordValue(body.query);
    const method = toHttpMethod(body.method);

    let requestBody: unknown = undefined;
    if (method !== "GET" && method !== "DELETE") {
        requestBody =
            typeof body.body === "string"
                ? (parseMaybeJson(body.body) ?? body.body)
                : body.body;
    }

    const headers: Record<string, string> = {};
    const customHeaders = asRecord(body.headers);
    if (customHeaders) {
        for (const [key, value] of Object.entries(customHeaders)) {
            if (value == null) continue;
            headers[key] = String(value);
        }
    }

    return {
        method,
        path,
        query,
        body: requestBody,
        headers,
    };
}

function buildSignedHeaders(
    method: string,
    path: string,
    extra: Record<string, string>,
): Record<string, string> {
    const apiKey = requiredEnv("DNSE_API_KEY");
    const apiSecret = requiredEnv("DNSE_API_SECRET");
    const dateValue = formatDateHeader(new Date());
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const signature = buildSignature(apiSecret, method, path, dateValue, nonce);

    const signatureHeaderValue = `Signature keyId="${apiKey}",algorithm="hmac-sha256",headers="(request-target) date",signature="${signature}",nonce="${nonce}"`;

    return {
        Date: dateValue,
        "X-Signature": signatureHeaderValue,
        "x-api-key": apiKey,
        ...extra,
    };
}

export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as ExecuteRequest;
        if (!payload || typeof payload !== "object") {
            return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
        }

        const dryRun = Boolean(payload.dryRun);
        const prepared =
            payload.mode === "custom"
                ? normalizeCustomRequest(payload)
                : normalizePresetRequest(payload);
        if ("errors" in prepared) {
            return NextResponse.json(
                { ok: false, error: "Validation failed", details: prepared.errors },
                { status: 400 },
            );
        }

        const baseUrl = resolveRestBaseUrl();
        const url = new URL(`${baseUrl}${prepared.path}`);
        for (const [key, value] of Object.entries(prepared.query)) {
            url.searchParams.set(key, String(value));
        }

        const extraHeaders = { ...prepared.headers };
        if (
            prepared.body !== undefined &&
            !Object.keys(extraHeaders).some(
                (key) => key.toLowerCase() === "content-type",
            )
        ) {
            extraHeaders["Content-Type"] = "application/json";
        }

        const headers = buildSignedHeaders(
            prepared.method,
            prepared.path,
            extraHeaders,
        );
        const startedAt = Date.now();

        const requestPreview = {
            method: prepared.method,
            url: url.toString(),
            path: prepared.path,
            query: prepared.query,
            headers: {
                ...headers,
                "x-api-key": "***",
                "X-Signature": "***",
            },
            body: prepared.body ?? null,
            dryRun,
        };

        if (dryRun) {
            return NextResponse.json({
                ok: true,
                mode: payload.mode,
                dryRun: true,
                elapsedMs: 0,
                request: requestPreview,
                response: null,
            });
        }

        const upstream = await fetch(url.toString(), {
            method: prepared.method,
            headers,
            body:
                prepared.body !== undefined
                    ? JSON.stringify(prepared.body)
                    : undefined,
            cache: "no-store",
        });

        const rawText = await upstream.text();
        const json = parseMaybeJson(rawText);
        const responseHeaders: Record<string, string> = {};
        upstream.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        return NextResponse.json({
            ok: upstream.ok,
            mode: payload.mode,
            dryRun: false,
            elapsedMs: Date.now() - startedAt,
            request: requestPreview,
            response: {
                status: upstream.status,
                statusText: upstream.statusText,
                headers: responseHeaders,
                raw: rawText,
                json,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}

