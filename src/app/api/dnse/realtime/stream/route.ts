import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
    return value && typeof value === "object"
        ? (value as JsonRecord)
        : null;
}

function readString(v: unknown, fallback: string): string {
    return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function normalizeToken(v: unknown, fallback: string): string {
    return readString(v, fallback).toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

function normalizeResolution(v: unknown): string {
    const value = readString(v, "1").toUpperCase();
    if (/^\d+$/.test(value)) return value;
    if (value === "1H" || value === "1D") return value;
    return "1";
}

function createSse(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function authMessage(apiKey: string, apiSecret: string): JsonRecord {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = String(Date.now() * 1000);
    const message = `${apiKey}:${timestamp}:${nonce}`;
    const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(message, "utf8")
        .digest("hex");

    return {
        action: "auth",
        api_key: apiKey,
        signature,
        timestamp,
        nonce,
    };
}

function subscribeMessage(channel: string, symbols: string[]): JsonRecord {
    return {
        action: "subscribe",
        channels: [
            {
                name: channel,
                symbols,
            },
        ],
    };
}

function parseIncoming(data: unknown): JsonRecord | null {
    if (typeof data === "string") {
        try {
            const parsed = JSON.parse(data);
            return asRecord(parsed);
        } catch {
            return { raw: data };
        }
    }
    if (data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(new Uint8Array(data));
        try {
            const parsed = JSON.parse(text);
            return asRecord(parsed);
        } catch {
            return { raw: text };
        }
    }
    if (data instanceof Blob) {
        return null;
    }
    return null;
}

export async function GET(request: Request) {
    const apiKey = readString(process.env.DNSE_API_KEY, "");
    const apiSecret = readString(process.env.DNSE_API_SECRET, "");
    if (!apiKey || !apiSecret) {
        return NextResponse.json(
            {
                error: "Missing DNSE_API_KEY or DNSE_API_SECRET in server environment.",
            },
            { status: 400 },
        );
    }

    const url = new URL(request.url);
    const symbol = normalizeToken(url.searchParams.get("symbol"), "HPG");
    const resolution = normalizeResolution(url.searchParams.get("resolution"));
    const board = normalizeToken(url.searchParams.get("board"), "G1");
    const marketIndex = normalizeToken(url.searchParams.get("marketIndex"), "HNX");
    const wsUrl = "wss://ws-openapi.dnse.com.vn/v1/stream?encoding=json";

    const channels = [
        `security_definition.${board}.json`,
        `tick.${board}.json`,
        `tick_extra.${board}.json`,
        `top_price.${board}.json`,
        `expected_price.${board}.json`,
        `ohlc.${resolution}.json`,
        `market_index.${marketIndex}.json`,
    ];

    const encoder = new TextEncoder();
    let ws: WebSocket | null = null;
    let isClosed = false;
    let isAuthed = false;

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const push = (event: string, payload: unknown) => {
                if (isClosed) return;
                controller.enqueue(encoder.encode(createSse(event, payload)));
            };

            const cleanup = () => {
                if (isClosed) return;
                isClosed = true;
                if (ws) {
                    try {
                        ws.close();
                    } catch {
                        // no-op
                    }
                    ws = null;
                }
                try {
                    controller.close();
                } catch {
                    // no-op
                }
            };

            request.signal.addEventListener("abort", cleanup);

            push("info", {
                type: "starting",
                wsUrl,
                symbol,
                board,
                marketIndex,
                resolution,
                channels,
            });

            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                push("info", {
                    type: "ws_open",
                    at: new Date().toISOString(),
                });
                const msg = authMessage(apiKey, apiSecret);
                ws?.send(JSON.stringify(msg));
            };

            ws.onmessage = (event) => {
                const data = parseIncoming(event.data);
                if (!data) return;

                const action = readString(data.action, readString(data.a, ""));
                if (action === "auth_success" && !isAuthed) {
                    isAuthed = true;
                    push("info", { type: "auth_success", data });

                    for (const channel of channels) {
                        const symbols = channel.startsWith("market_index.")
                            ? []
                            : [symbol];
                        ws?.send(JSON.stringify(subscribeMessage(channel, symbols)));
                    }
                    return;
                }

                if (action === "auth_error" || action === "error") {
                    push("error", { type: "auth_or_server_error", data });
                    return;
                }

                push("message", {
                    receivedAt: new Date().toISOString(),
                    data,
                });
            };

            ws.onerror = () => {
                push("error", {
                    type: "ws_error",
                    message: "DNSE websocket error",
                });
            };

            ws.onclose = (event) => {
                push("info", {
                    type: "ws_close",
                    code: event.code,
                    reason: event.reason || "closed",
                });
                cleanup();
            };
        },
    });

    const headers = new Headers();
    headers.set("content-type", "text/event-stream; charset=utf-8");
    headers.set("cache-control", "no-cache, no-transform");
    headers.set("connection", "keep-alive");

    return new Response(stream, { status: 200, headers });
}

export function POST() {
    return NextResponse.json(
        { error: "Use GET for DNSE realtime stream." },
        { status: 405 },
    );
}
