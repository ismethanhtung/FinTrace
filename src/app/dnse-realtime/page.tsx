"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Play, ShieldCheck, Square, Wifi } from "lucide-react";
import { AppTopBar } from "../../components/shell/AppTopBar";
import { TickerBar } from "../../components/TickerBar";

type StreamStatus = "idle" | "connecting" | "connected" | "error";

type InfoEvent = {
    type: string;
    [key: string]: unknown;
};

type MessageEventPayload = {
    receivedAt: string;
    data: unknown;
};

type LogEntry = {
    at: string;
    kind: "info" | "error" | "message";
    title: string;
    data: unknown;
};

function prettyJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function addLog(prev: LogEntry[], entry: LogEntry): LogEntry[] {
    return [entry, ...prev].slice(0, 200);
}

export default function DnseRealtimePage() {
    const eventSourceRef = useRef<EventSource | null>(null);
    const [status, setStatus] = useState<StreamStatus>("idle");
    const [symbol, setSymbol] = useState("HPG");
    const [index, setIndex] = useState("VNINDEX");
    const [board, setBoard] = useState("G1");
    const [marketIndex, setMarketIndex] = useState("HNX");
    const [resolution, setResolution] = useState("1");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [messageCount, setMessageCount] = useState(0);
    const [lastMessage, setLastMessage] = useState<MessageEventPayload | null>(null);

    const canConnect = useMemo(
        () => status === "idle" || status === "error",
        [status],
    );

    const stop = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setStatus("idle");
        setLogs((prev) =>
            addLog(prev, {
                at: new Date().toISOString(),
                kind: "info",
                title: "stream_stopped",
                data: {},
            }),
        );
    };

    const connect = () => {
        if (!canConnect) return;
        setStatus("connecting");
        setMessageCount(0);
        setLastMessage(null);
        setLogs([]);

        const qs = new URLSearchParams({
            symbol: symbol.trim().toUpperCase(),
            index: index.trim().toUpperCase(),
            board: board.trim().toUpperCase(),
            marketIndex: marketIndex.trim().toUpperCase(),
            resolution: resolution.trim().toUpperCase(),
        });

        const es = new EventSource(`/api/dnse/realtime/stream?${qs.toString()}`);
        eventSourceRef.current = es;

        es.addEventListener("info", (event) => {
            try {
                const data = JSON.parse((event as MessageEvent).data) as InfoEvent;
                if (data.type === "ws_open" || data.type === "suback") {
                    setStatus("connected");
                }
                setLogs((prev) =>
                    addLog(prev, {
                        at: new Date().toISOString(),
                        kind: "info",
                        title: String(data.type || "info"),
                        data,
                    }),
                );
            } catch {
                // no-op
            }
        });

        es.addEventListener("message", (event) => {
            try {
                const data = JSON.parse(
                    (event as MessageEvent).data,
                ) as MessageEventPayload;
                const root = (data.data || {}) as Record<string, unknown>;
                const channel =
                    (typeof root.c === "string" && root.c) ||
                    (typeof root.channel === "string" && root.channel) ||
                    "market_message";
                setStatus("connected");
                setMessageCount((prev) => prev + 1);
                setLastMessage(data);
                setLogs((prev) =>
                    addLog(prev, {
                        at: new Date().toISOString(),
                        kind: "message",
                        title: channel,
                        data,
                    }),
                );
            } catch {
                // no-op
            }
        });

        es.addEventListener("error", (event) => {
            let payload: unknown = {};
            try {
                const raw = (event as MessageEvent).data;
                payload = raw ? JSON.parse(raw) : {};
            } catch {
                payload = { message: "Unknown stream error" };
            }
            setStatus("error");
            setLogs((prev) =>
                addLog(prev, {
                    at: new Date().toISOString(),
                    kind: "error",
                    title: "stream_error",
                    data: payload,
                }),
            );
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        });
    };

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []);

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            <AppTopBar />

            <main className="flex-1 min-h-0 overflow-auto p-6 sm:p-8 mx-auto w-full max-w-[1600px]">
                <div className="rounded-xl border border-main bg-main overflow-hidden">
                    <div className="border-b border-main px-4 py-3 bg-secondary/10">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted">
                            <ShieldCheck size={14} />
                            DNSE Realtime Market Stream (Live)
                        </div>
                        <h1 className="mt-2 text-[20px] font-semibold">
                            DNSE WebSocket Live Inspector
                        </h1>
                        <div className="mt-2 text-[12px] text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="inline-flex items-center gap-1.5">
                                <Wifi size={13} />
                                wss://ws-openapi.dnse.com.vn/v1/stream?encoding=json
                            </span>
                            <span>
                                Status:{" "}
                                <span className="font-semibold uppercase">
                                    {status}
                                </span>
                            </span>
                            <span>Messages: {messageCount}</span>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200 flex gap-2">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <div>
                                Stream dùng auth server-side từ env (
                                <code>DNSE_API_KEY</code>,{" "}
                                <code>DNSE_API_SECRET</code>). Secret không đẩy xuống
                                browser. Chỉ subscribe market channels theo docs.
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                            <label className="flex flex-col gap-1 text-[12px]">
                                <span className="text-muted">symbol</span>
                                <input
                                    className="border border-main rounded-md bg-main px-2 py-2"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value)}
                                    disabled={status === "connecting" || status === "connected"}
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-[12px]">
                                <span className="text-muted">index</span>
                                <input
                                    className="border border-main rounded-md bg-main px-2 py-2"
                                    value={index}
                                    onChange={(e) => setIndex(e.target.value)}
                                    disabled={status === "connecting" || status === "connected"}
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-[12px]">
                                <span className="text-muted">board</span>
                                <input
                                    className="border border-main rounded-md bg-main px-2 py-2"
                                    value={board}
                                    onChange={(e) => setBoard(e.target.value)}
                                    disabled={status === "connecting" || status === "connected"}
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-[12px]">
                                <span className="text-muted">marketIndex</span>
                                <input
                                    className="border border-main rounded-md bg-main px-2 py-2"
                                    value={marketIndex}
                                    onChange={(e) => setMarketIndex(e.target.value)}
                                    disabled={status === "connecting" || status === "connected"}
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-[12px]">
                                <span className="text-muted">resolution</span>
                                <input
                                    className="border border-main rounded-md bg-main px-2 py-2"
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    disabled={status === "connecting" || status === "connected"}
                                />
                            </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={connect}
                                disabled={!canConnect}
                                className="px-3 py-2 rounded-md border border-main bg-main text-muted hover:text-main hover:bg-secondary transition-colors text-[12px] font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                            >
                                <Play size={14} />
                                Connect Live Stream
                            </button>
                            <button
                                type="button"
                                onClick={stop}
                                disabled={status === "idle"}
                                className="px-3 py-2 rounded-md border border-main bg-main text-muted hover:text-main hover:bg-secondary transition-colors text-[12px] font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                            >
                                <Square size={14} />
                                Stop
                            </button>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-3 min-h-0">
                            <div className="rounded-lg border border-main bg-black/30 overflow-hidden">
                                <div className="px-3 py-2 border-b border-main text-[11px] text-muted font-mono">
                                    latest payload
                                </div>
                                <pre className="p-3 text-[12px] leading-5 overflow-auto max-h-[58vh]">
                                    {prettyJson(lastMessage)}
                                </pre>
                            </div>

                            <div className="rounded-lg border border-main bg-main/40 overflow-hidden">
                                <div className="px-3 py-2 border-b border-main text-[11px] text-muted font-mono">
                                    event log (newest first)
                                </div>
                                <div className="max-h-[58vh] overflow-auto">
                                    {logs.length === 0 ? (
                                        <div className="p-3 text-[12px] text-muted">
                                            No events yet.
                                        </div>
                                    ) : (
                                        logs.map((log, idx) => (
                                            <div
                                                key={`${log.at}-${idx}`}
                                                className="border-b border-main/40 p-3"
                                            >
                                                <div className="text-[11px] text-muted font-mono">
                                                    {log.at}
                                                </div>
                                                <div
                                                    className={`text-[12px] font-semibold mt-1 ${
                                                        log.kind === "error"
                                                            ? "text-rose-400"
                                                            : log.kind === "message"
                                                              ? "text-emerald-300"
                                                              : "text-main"
                                                    }`}
                                                >
                                                    {log.title}
                                                </div>
                                                <pre className="mt-1 text-[11px] leading-5 overflow-auto whitespace-pre-wrap break-all">
                                                    {prettyJson(log.data)}
                                                </pre>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <TickerBar />
        </div>
    );
}
