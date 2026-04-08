import crypto from "node:crypto";
import { NextResponse } from "next/server";
import WebSocket from "ws";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;
const MAX_SYMBOLS = 300;
const PROACTIVE_PONG_INTERVAL_MS = 2 * 60 * 1000;
const SSE_HEARTBEAT_INTERVAL_MS = 15 * 1000;
const DEFAULT_WS_BASE_URL = "wss://ws-openapi.dnse.com.vn/v1/stream";

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

function normalizeSymbolList(value: unknown, fallback: string): string[] {
    const raw = readString(value, "");
    const items = raw
        .split(/[,\s]+/g)
        .map((item) => normalizeToken(item, ""))
        .filter(Boolean);
    const deduped = Array.from(new Set(items));
    if (deduped.length) {
        return deduped.slice(0, MAX_SYMBOLS);
    }
    return [normalizeToken(fallback, "HPG")];
}

function normalizeResolution(v: unknown): string {
    const value = readString(v, "1").toUpperCase();
    if (/^\d+$/.test(value)) return value;
    if (value === "1H" || value === "1D") return value;
    if (value === "1W" || value === "1M") return value;
    return "1";
}

function normalizeEncoding(v: unknown): "json" | "msgpack" {
    const encoding = readString(v, "json").toLowerCase();
    return encoding === "msgpack" ? "msgpack" : "json";
}

function normalizeChannelName(value: string): string {
    return value.trim().replace(/\s+/g, "");
}

function resolveChannelName(
    channel: string,
    params: { board: string; resolution: string; marketIndex: string; encoding: "json" | "msgpack" },
): string {
    const raw = normalizeChannelName(channel);
    const lower = raw.toLowerCase();
    if (lower === "orders" || lower === "positions" || lower === "account") {
        return lower;
    }

    const resolved = raw
        .replace(/\{board\}/gi, params.board)
        .replace(/\{resolution\}/gi, params.resolution)
        .replace(/\{marketindex\}/gi, params.marketIndex);

    if (/\.(json|msgpack)$/i.test(resolved)) {
        return resolved.replace(/\.(json|msgpack)$/i, `.${params.encoding}`);
    }
    return `${resolved}.${params.encoding}`;
}

function channelNeedsSymbols(channel: string): boolean {
    const normalized = normalizeChannelName(channel).toLowerCase();
    if (!normalized) return false;
    if (normalized === "orders") return false;
    if (normalized === "positions") return false;
    if (normalized === "account") return false;
    if (normalized.startsWith("market_index.")) return false;
    return true;
}

function normalizeChannelList(value: unknown): string[] {
    const raw = readString(value, "");
    if (!raw) return [];
    const channels = raw
        .split(/[,\n]+/g)
        .map((item) => normalizeChannelName(item))
        .filter(Boolean);
    return Array.from(new Set(channels));
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

function wsRawToParseInput(data: WebSocket.RawData): string | ArrayBuffer {
    if (typeof data === "string") return data;
    if (data instanceof ArrayBuffer) return data;
    const buf = Buffer.isBuffer(data)
        ? data
        : Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.from(new Uint8Array(data));
    return new Uint8Array(buf).buffer;
}

function wsRawAsUtf8PingCheck(data: WebSocket.RawData): string | null {
    if (typeof data === "string") return data;
    if (Buffer.isBuffer(data)) return data.toString("utf8");
    if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
    return null;
}

async function parseIncoming(data: unknown): Promise<JsonRecord | null> {
    if (typeof data === "string") {
        try {
            const parsed = JSON.parse(data);
            return asRecord(parsed);
        } catch {
            return { raw: data };
        }
    }
    if (data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(data);
        const text = new TextDecoder().decode(bytes);
        try {
            const parsed = JSON.parse(text);
            return asRecord(parsed);
        } catch {
            return { rawBase64: Buffer.from(bytes).toString("base64") };
        }
    }
    if (data instanceof Blob) {
        const buffer = await data.arrayBuffer();
        return parseIncoming(buffer);
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
    const symbols = normalizeSymbolList(url.searchParams.get("symbols"), symbol);
    const resolution = normalizeResolution(url.searchParams.get("resolution"));
    const board = normalizeToken(url.searchParams.get("board"), "G1");
    const encoding = normalizeEncoding(url.searchParams.get("encoding"));
    const marketIndex = normalizeToken(
        url.searchParams.get("marketIndex") ?? url.searchParams.get("index"),
        "VNINDEX",
    );
    const wsBaseUrl = readString(url.searchParams.get("wsBaseUrl"), DEFAULT_WS_BASE_URL);
    const wsUrl = `${wsBaseUrl.replace(/\/+$/, "")}?encoding=${encoding}`;

    const defaultChannels = [
        "security_definition.{board}.json",
        "tick.{board}.json",
        "tick_extra.{board}.json",
        "top_price.{board}.json",
        "expected_price.{board}.json",
        "ohlc.{resolution}.json",
        "market_index.{marketIndex}.json",
    ];
    const customChannels = normalizeChannelList(url.searchParams.get("channels"));
    const channelCandidates = customChannels.length ? customChannels : defaultChannels;
    const channels = Array.from(
        new Set(
            channelCandidates
                .map((channel) =>
                    resolveChannelName(channel, {
                        board,
                        resolution,
                        marketIndex,
                        encoding,
                    }),
                )
                .filter(Boolean),
        ),
    );

    const encoder = new TextEncoder();
    let ws: InstanceType<typeof WebSocket> | null = null;
    let isClosed = false;
    let isAuthed = false;
    let proactivePongTimer: ReturnType<typeof setInterval> | null = null;
    let sseHeartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const push = (event: string, payload: unknown) => {
                if (isClosed) return;
                controller.enqueue(encoder.encode(createSse(event, payload)));
            };

            const cleanup = () => {
                if (isClosed) return;
                isClosed = true;
                if (proactivePongTimer) {
                    clearInterval(proactivePongTimer);
                    proactivePongTimer = null;
                }
                if (sseHeartbeatTimer) {
                    clearInterval(sseHeartbeatTimer);
                    sseHeartbeatTimer = null;
                }
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

            sseHeartbeatTimer = setInterval(() => {
                push("info", {
                    type: "sse_heartbeat",
                    at: new Date().toISOString(),
                });
            }, SSE_HEARTBEAT_INTERVAL_MS);

            const sendPong = () => {
                if (!ws || ws.readyState !== WebSocket.OPEN) return;
                const payloads = [
                    JSON.stringify({
                        action: "pong",
                        ts: Math.floor(Date.now() / 1000),
                    }),
                    "PONG",
                ];
                for (const payload of payloads) {
                    try {
                        ws.send(payload);
                        return;
                    } catch {
                        // try next payload style
                    }
                }
            };

            push("info", {
                type: "starting",
                wsUrl,
                symbol,
                symbols,
                board,
                marketIndex,
                resolution,
                encoding,
                channels,
            });

            ws = new WebSocket(wsUrl);

            ws.on("open", () => {
                push("info", {
                    type: "ws_open",
                    at: new Date().toISOString(),
                });
                const msg = authMessage(apiKey, apiSecret);
                ws?.send(JSON.stringify(msg));
            });

            ws.on("message", async (rawData) => {
                const pingProbe = wsRawAsUtf8PingCheck(rawData);
                if (
                    pingProbe !== null &&
                    pingProbe.trim().toUpperCase() === "PING"
                ) {
                    sendPong();
                    return;
                }

                const incoming = wsRawToParseInput(rawData);
                const data = await parseIncoming(incoming);
                if (!data) return;

                const action = readString(
                    data.action,
                    readString(data.a, readString(data.type, "")),
                ).toLowerCase();
                if (action === "ping") {
                    sendPong();
                    return;
                }
                if (action === "auth_success" && !isAuthed) {
                    isAuthed = true;
                    push("info", { type: "auth_success", data });

                    for (const channel of channels) {
                        const normalizedChannel = normalizeChannelName(channel);
                        if (!normalizedChannel) continue;
                        const needsSymbols = channelNeedsSymbols(normalizedChannel);
                        const channelSymbols = needsSymbols ? symbols : [];
                        if (!channelSymbols.length && needsSymbols) {
                            continue;
                        }
                        ws?.send(
                            JSON.stringify(
                                subscribeMessage(normalizedChannel, channelSymbols),
                            ),
                        );
                        push("info", {
                            type: "subscription_sent",
                            channel: normalizedChannel,
                            symbolCount: channelSymbols.length,
                        });
                    }
                    proactivePongTimer = setInterval(
                        sendPong,
                        PROACTIVE_PONG_INTERVAL_MS,
                    );
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
            });

            ws.on("error", (err) => {
                push("error", {
                    type: "ws_error",
                    message:
                        err instanceof Error && err.message
                            ? err.message
                            : "DNSE websocket error",
                });
            });

            ws.on("close", (code, reasonBuf) => {
                push("info", {
                    type: "ws_close",
                    code,
                    reason:
                        (reasonBuf && reasonBuf.length
                            ? reasonBuf.toString("utf8")
                            : "") || "closed",
                });
                cleanup();
            });
        },
    });

    const headers = new Headers();
    headers.set("content-type", "text/event-stream; charset=utf-8");
    headers.set("cache-control", "no-cache, no-store, no-transform");
    headers.set("connection", "keep-alive");
    headers.set("x-accel-buffering", "no");

    return new Response(stream, { status: 200, headers });
}

export function POST() {
    return NextResponse.json(
        { error: "Use GET for DNSE realtime stream." },
        { status: 405 },
    );
}
