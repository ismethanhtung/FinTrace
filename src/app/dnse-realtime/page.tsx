"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    Play,
    ShieldCheck,
    Square,
    Wifi,
    DatabaseZap,
    Workflow,
    RefreshCcw,
} from "lucide-react";
import { AppTopBar } from "../../components/shell/AppTopBar";
import { TickerBar } from "../../components/TickerBar";
import {
    DNSE_MARKET_WS_CHANNEL_TEMPLATES,
    DNSE_PRIVATE_WS_CHANNELS,
    DNSE_PRESET_OPERATIONS,
    DNSE_UNDOCUMENTED_SAMPLE_NOTES,
    getDnsePresetOperation,
} from "../../lib/dnse/openapiCatalog";
import { cn } from "../../lib/utils";

type StreamStatus = "idle" | "connecting" | "connected" | "error";

type InfoEvent = {
    type?: string;
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

type TesterTab = "rest" | "ws";
type RestMode = "preset" | "custom";

type ExecuteResult = {
    ok: boolean;
    error?: string;
    details?: string[];
    mode?: RestMode;
    dryRun?: boolean;
    elapsedMs?: number;
    request?: unknown;
    response?: unknown;
};

const MAX_LOGS = 300;

function prettyJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function addLog(prev: LogEntry[], entry: LogEntry): LogEntry[] {
    return [entry, ...prev].slice(0, MAX_LOGS);
}

function parseJsonObjectText(text: string): {
    value: Record<string, unknown>;
    error: string | null;
} {
    const trimmed = text.trim();
    if (!trimmed) return { value: {}, error: null };
    try {
        const parsed = JSON.parse(trimmed);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return { value: {}, error: "JSON phải là object dạng { ... }" };
        }
        return { value: parsed as Record<string, unknown>, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid JSON";
        return { value: {}, error: message };
    }
}

function normalizeSymbolList(input: string): string[] {
    return Array.from(
        new Set(
            input
                .split(/[,\s]+/g)
                .map((value) => value.trim().toUpperCase())
                .filter((value) => Boolean(value)),
        ),
    );
}

function normalizeChannels(input: string): string[] {
    return Array.from(
        new Set(
            input
                .split(/[,\n]+/g)
                .map((value) => value.trim())
                .filter(Boolean),
        ),
    );
}

function resolveWsChannelTemplate(
    channel: string,
    params: {
        board: string;
        resolution: string;
        marketIndex: string;
        encoding: "json" | "msgpack";
    },
): string {
    const raw = channel.trim();
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

function logKindClass(kind: LogEntry["kind"]): string {
    if (kind === "error") return "text-rose-400";
    if (kind === "message") return "text-emerald-300";
    return "text-main";
}

export default function DnseRealtimePage() {
    const eventSourceRef = useRef<EventSource | null>(null);

    const [activeTab, setActiveTab] = useState<TesterTab>("rest");

    // REST tester state
    const [restMode, setRestMode] = useState<RestMode>("preset");
    const [selectedOperationKey, setSelectedOperationKey] = useState(
        DNSE_PRESET_OPERATIONS[0]?.key ?? "",
    );
    const [presetPathText, setPresetPathText] = useState("{}");
    const [presetQueryText, setPresetQueryText] = useState("{}");
    const [presetBodyText, setPresetBodyText] = useState("{}");
    const [presetTradingToken, setPresetTradingToken] = useState("");
    const [customMethod, setCustomMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("GET");
    const [customPath, setCustomPath] = useState("/accounts");
    const [customQueryText, setCustomQueryText] = useState("{}");
    const [customBodyText, setCustomBodyText] = useState("{}");
    const [customHeadersText, setCustomHeadersText] = useState("{}");
    const [restDryRun, setRestDryRun] = useState(false);
    const [restBusy, setRestBusy] = useState(false);
    const [restInputError, setRestInputError] = useState<string | null>(null);
    const [restResult, setRestResult] = useState<ExecuteResult | null>(null);

    // WS tester state
    const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
    const [wsSymbolsText, setWsSymbolsText] = useState("HPG");
    const [wsBoard, setWsBoard] = useState("G1");
    const [wsMarketIndex, setWsMarketIndex] = useState("VNINDEX");
    const [wsResolution, setWsResolution] = useState("1");
    const [wsEncoding, setWsEncoding] = useState<"json" | "msgpack">("json");
    const [wsSelectedChannels, setWsSelectedChannels] = useState<string[]>(
        [...DNSE_MARKET_WS_CHANNEL_TEMPLATES],
    );
    const [wsSelectedPrivateChannels, setWsSelectedPrivateChannels] = useState<
        string[]
    >([]);
    const [wsCustomChannelsText, setWsCustomChannelsText] = useState("");
    const [wsLogs, setWsLogs] = useState<LogEntry[]>([]);
    const [wsMessageCount, setWsMessageCount] = useState(0);
    const [wsLastMessage, setWsLastMessage] = useState<MessageEventPayload | null>(
        null,
    );

    const selectedOperation = useMemo(
        () => getDnsePresetOperation(selectedOperationKey),
        [selectedOperationKey],
    );

    const groupedOperations = useMemo(() => {
        const grouped = new Map<string, typeof DNSE_PRESET_OPERATIONS>();
        for (const op of DNSE_PRESET_OPERATIONS) {
            const list = grouped.get(op.group) ?? [];
            list.push(op);
            grouped.set(op.group, list);
        }
        return Array.from(grouped.entries());
    }, []);

    const hydratePreset = () => {
        if (!selectedOperation) return;
        setPresetPathText(prettyJson(selectedOperation.samplePath ?? {}));
        setPresetQueryText(prettyJson(selectedOperation.sampleQuery ?? {}));
        setPresetBodyText(prettyJson(selectedOperation.sampleBody ?? {}));
        setPresetTradingToken("");
        setRestInputError(null);
    };

    useEffect(() => {
        hydratePreset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedOperationKey]);

    const executeRest = async () => {
        setRestBusy(true);
        setRestInputError(null);
        setRestResult(null);

        try {
            if (restMode === "preset") {
                if (!selectedOperation) {
                    setRestInputError("Vui lòng chọn operation preset.");
                    return;
                }

                const pathParsed = parseJsonObjectText(presetPathText);
                if (pathParsed.error) {
                    setRestInputError(`Path params JSON lỗi: ${pathParsed.error}`);
                    return;
                }
                const queryParsed = parseJsonObjectText(presetQueryText);
                if (queryParsed.error) {
                    setRestInputError(`Query JSON lỗi: ${queryParsed.error}`);
                    return;
                }
                const bodyParsed = parseJsonObjectText(presetBodyText);
                if (bodyParsed.error) {
                    setRestInputError(`Body JSON lỗi: ${bodyParsed.error}`);
                    return;
                }

                const response = await fetch("/api/dnse/openapi/execute", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        mode: "preset",
                        operation: selectedOperation.key,
                        pathParams: pathParsed.value,
                        query: queryParsed.value,
                        body: bodyParsed.value,
                        tradingToken: presetTradingToken,
                        dryRun: restDryRun,
                    }),
                });
                const data = (await response.json()) as ExecuteResult;
                setRestResult(data);
                return;
            }

            const queryParsed = parseJsonObjectText(customQueryText);
            if (queryParsed.error) {
                setRestInputError(`Custom query JSON lỗi: ${queryParsed.error}`);
                return;
            }
            const bodyParsed = parseJsonObjectText(customBodyText);
            if (bodyParsed.error) {
                setRestInputError(`Custom body JSON lỗi: ${bodyParsed.error}`);
                return;
            }
            const headersParsed = parseJsonObjectText(customHeadersText);
            if (headersParsed.error) {
                setRestInputError(`Custom headers JSON lỗi: ${headersParsed.error}`);
                return;
            }

            const response = await fetch("/api/dnse/openapi/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: "custom",
                    method: customMethod,
                    path: customPath,
                    query: queryParsed.value,
                    body: bodyParsed.value,
                    headers: headersParsed.value,
                    dryRun: restDryRun,
                }),
            });
            const data = (await response.json()) as ExecuteResult;
            setRestResult(data);
        } catch (error) {
            setRestResult({
                ok: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        } finally {
            setRestBusy(false);
        }
    };

    const stopWs = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setStreamStatus("idle");
        setWsLogs((prev) =>
            addLog(prev, {
                at: new Date().toISOString(),
                kind: "info",
                title: "stream_stopped",
                data: {},
            }),
        );
    };

    const connectWs = () => {
        if (streamStatus === "connecting" || streamStatus === "connected") {
            return;
        }

        setStreamStatus("connecting");
        setWsMessageCount(0);
        setWsLastMessage(null);
        setWsLogs([]);

        const symbols = normalizeSymbolList(wsSymbolsText);
        const channels = Array.from(
            new Set(
                [
                    ...wsSelectedChannels,
                    ...wsSelectedPrivateChannels,
                    ...normalizeChannels(wsCustomChannelsText),
                ]
                    .map((channel) =>
                        resolveWsChannelTemplate(channel, {
                            board: wsBoard.trim().toUpperCase(),
                            marketIndex: wsMarketIndex.trim().toUpperCase(),
                            resolution: wsResolution.trim().toUpperCase(),
                            encoding: wsEncoding,
                        }),
                    )
                    .filter(Boolean),
            ),
        );

        const qs = new URLSearchParams({
            symbols: symbols.join(","),
            board: wsBoard.trim().toUpperCase(),
            marketIndex: wsMarketIndex.trim().toUpperCase(),
            resolution: wsResolution.trim().toUpperCase(),
            encoding: wsEncoding,
        });
        if (channels.length) {
            qs.set("channels", channels.join(","));
        }

        const es = new EventSource(`/api/dnse/realtime/stream?${qs.toString()}`);
        eventSourceRef.current = es;

        es.addEventListener("info", (event) => {
            try {
                const data = JSON.parse((event as MessageEvent).data) as InfoEvent;
                const type = String(data.type || "").toLowerCase();
                if (
                    type === "ws_open" ||
                    type === "auth_success" ||
                    type === "subscription_sent"
                ) {
                    setStreamStatus("connected");
                }
                setWsLogs((prev) =>
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
                setStreamStatus("connected");
                setWsMessageCount((prev) => prev + 1);
                setWsLastMessage(data);
                setWsLogs((prev) =>
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
            setStreamStatus("error");
            setWsLogs((prev) =>
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
        <div className="flex h-screen w-full flex-col overflow-hidden bg-main text-main">
            <AppTopBar />

            <main className="mx-auto flex w-full max-w-[1700px] flex-1 min-h-0 flex-col overflow-auto p-4 sm:p-6">
                <div className="overflow-hidden rounded-xl border border-main bg-main">
                    <div className="border-b border-main bg-secondary/10 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                            <ShieldCheck size={14} />
                            DNSE Full API / WebSocket Test Console
                        </div>
                        <h1 className="mt-2 text-[20px] font-semibold">
                            DNSE Integration QA Playground
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
                            <span className="inline-flex items-center gap-1.5">
                                <Wifi size={13} />
                                wss://ws-openapi.dnse.com.vn/v1/stream
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <DatabaseZap size={13} />
                                https://openapi.dnse.com.vn
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 p-4">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab("rest")}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                                    activeTab === "rest"
                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                        : "border-main bg-main text-muted hover:text-main",
                                )}
                            >
                                <Workflow size={14} />
                                REST API Tester
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("ws")}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                                    activeTab === "ws"
                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                        : "border-main bg-main text-muted hover:text-main",
                                )}
                            >
                                <Wifi size={14} />
                                WebSocket Tester
                            </button>
                        </div>

                        {activeTab === "rest" ? (
                            <div className="space-y-4">
                                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
                                    REST requests ký <code>X-Signature</code> server-side
                                    bằng <code>DNSE_API_KEY</code>/<code>DNSE_API_SECRET</code>.
                                    Bạn có thể test toàn bộ preset API hoặc tự nhập endpoint ở
                                    Custom mode.
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRestMode("preset")}
                                        className={cn(
                                            "rounded-md border px-3 py-1.5 text-[12px] font-semibold",
                                            restMode === "preset"
                                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                                : "border-main bg-main text-muted",
                                        )}
                                    >
                                        Preset APIs
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRestMode("custom")}
                                        className={cn(
                                            "rounded-md border px-3 py-1.5 text-[12px] font-semibold",
                                            restMode === "custom"
                                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                                : "border-main bg-main text-muted",
                                        )}
                                    >
                                        Custom REST
                                    </button>
                                    <label className="ml-auto inline-flex items-center gap-2 rounded-md border border-main bg-main px-3 py-1.5 text-[12px] text-muted">
                                        <input
                                            type="checkbox"
                                            checked={restDryRun}
                                            onChange={(e) =>
                                                setRestDryRun(e.target.checked)
                                            }
                                        />
                                        Dry Run
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
                                    <div className="space-y-3 rounded-lg border border-main bg-secondary/10 p-3">
                                        {restMode === "preset" ? (
                                            <>
                                                <label className="flex flex-col gap-1 text-[12px]">
                                                    <span className="text-muted">
                                                        Preset operation
                                                    </span>
                                                    <select
                                                        className="rounded-md border border-main bg-main px-2 py-2"
                                                        value={selectedOperationKey}
                                                        onChange={(e) =>
                                                            setSelectedOperationKey(
                                                                e.target.value,
                                                            )
                                                        }
                                                    >
                                                        {groupedOperations.map(
                                                            ([group, ops]) => (
                                                                <optgroup
                                                                    key={group}
                                                                    label={group}
                                                                >
                                                                    {ops.map((op) => (
                                                                        <option
                                                                            key={op.key}
                                                                            value={op.key}
                                                                        >
                                                                            {op.name} (
                                                                            {op.method}{" "}
                                                                            {op.pathTemplate})
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            ),
                                                        )}
                                                    </select>
                                                </label>

                                                {selectedOperation ? (
                                                    <div className="rounded-md border border-main bg-main p-2 text-[11px] text-muted">
                                                        <div className="font-semibold text-main">
                                                            {selectedOperation.name}
                                                        </div>
                                                        <div className="mt-1">
                                                            {selectedOperation.method}{" "}
                                                            {selectedOperation.pathTemplate}
                                                        </div>
                                                        <div className="mt-1">
                                                            {selectedOperation.description}
                                                        </div>
                                                        {selectedOperation.requiresTradingToken ? (
                                                            <div className="mt-1 text-amber-400">
                                                                Yêu cầu trading-token
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ) : null}

                                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                    <label className="flex flex-col gap-1 text-[12px]">
                                                        <span className="text-muted">
                                                            Path params JSON
                                                        </span>
                                                        <textarea
                                                            className="min-h-[108px] rounded-md border border-main bg-main px-2 py-2 font-mono text-[11px]"
                                                            value={presetPathText}
                                                            onChange={(e) =>
                                                                setPresetPathText(
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label className="flex flex-col gap-1 text-[12px]">
                                                        <span className="text-muted">
                                                            Query JSON
                                                        </span>
                                                        <textarea
                                                            className="min-h-[108px] rounded-md border border-main bg-main px-2 py-2 font-mono text-[11px]"
                                                            value={presetQueryText}
                                                            onChange={(e) =>
                                                                setPresetQueryText(
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                </div>

                                                <label className="flex flex-col gap-1 text-[12px]">
                                                    <span className="text-muted">
                                                        Body JSON
                                                    </span>
                                                    <textarea
                                                        className="min-h-[160px] rounded-md border border-main bg-main px-2 py-2 font-mono text-[11px]"
                                                        value={presetBodyText}
                                                        onChange={(e) =>
                                                            setPresetBodyText(e.target.value)
                                                        }
                                                    />
                                                </label>

                                                <label className="flex flex-col gap-1 text-[12px]">
                                                    <span className="text-muted">
                                                        Trading Token (nếu cần)
                                                    </span>
                                                    <input
                                                        className="rounded-md border border-main bg-main px-2 py-2"
                                                        value={presetTradingToken}
                                                        onChange={(e) =>
                                                            setPresetTradingToken(
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </label>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={executeRest}
                                                        disabled={restBusy}
                                                        className="inline-flex items-center gap-2 rounded-md border border-main bg-main px-3 py-2 text-[12px] font-semibold text-muted transition-colors hover:bg-secondary hover:text-main disabled:opacity-60"
                                                    >
                                                        <Play size={14} />
                                                        Run Preset
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={hydratePreset}
                                                        disabled={restBusy}
                                                        className="inline-flex items-center gap-2 rounded-md border border-main bg-main px-3 py-2 text-[12px] font-semibold text-muted transition-colors hover:bg-secondary hover:text-main disabled:opacity-60"
                                                    >
                                                        <RefreshCcw size={14} />
                                                        Load Sample
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-1 gap-2 md:grid-cols-[140px_1fr]">
                                                    <label className="flex flex-col gap-1 text-[12px]">
                                                        <span className="text-muted">
                                                            Method
                                                        </span>
                                                        <select
                                                            className="rounded-md border border-main bg-main px-2 py-2"
                                                            value={customMethod}
                                                            onChange={(e) =>
                                                                setCustomMethod(
                                                                    e.target
                                                                        .value as
                                                                        | "GET"
                                                                        | "POST"
                                                                        | "PUT"
                                                                        | "DELETE",
                                                                )
                                                            }
                                                        >
                                                            <option value="GET">GET</option>
                                                            <option value="POST">POST</option>
                                                            <option value="PUT">PUT</option>
                                                            <option value="DELETE">
                                                                DELETE
                                                            </option>
                                                        </select>
                                                    </label>
                                                    <label className="flex flex-col gap-1 text-[12px]">
                                                        <span className="text-muted">
                                                            Path
                                                        </span>
                                                        <input
                                                            className="rounded-md border border-main bg-main px-2 py-2 font-mono text-[11px]"
                                                            value={customPath}
                                                            onChange={(e) =>
                                                                setCustomPath(e.target.value)
                                                            }
                                                        />
                                                    </label>
                                                </div>

                                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                    <label className="flex flex-col gap-1 text-[12px]">
                                                        <span className="text-muted">
                                                            Query JSON
                                                        </span>
                                                        <textarea
                                                            className="min-h-[108px] rounded-md border border-main bg-main px-2 py-2 font-mono text-[11px]"
                                                            value={customQueryText}
                                                            onChange={(e) =>
                                                                setCustomQueryText(
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label className="flex flex-col gap-1 text-[12px]">
                                                        <span className="text-muted">
                                                            Headers JSON
                                                        </span>
                                                        <textarea
                                                            className="min-h-[108px] rounded-md border border-main bg-main px-2 py-2 font-mono text-[11px]"
                                                            value={customHeadersText}
                                                            onChange={(e) =>
                                                                setCustomHeadersText(
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                </div>

                                                <label className="flex flex-col gap-1 text-[12px]">
                                                    <span className="text-muted">
                                                        Body JSON
                                                    </span>
                                                    <textarea
                                                        className="min-h-[160px] rounded-md border border-main bg-main px-2 py-2 font-mono text-[11px]"
                                                        value={customBodyText}
                                                        onChange={(e) =>
                                                            setCustomBodyText(e.target.value)
                                                        }
                                                    />
                                                </label>

                                                <button
                                                    type="button"
                                                    onClick={executeRest}
                                                    disabled={restBusy}
                                                    className="inline-flex items-center gap-2 rounded-md border border-main bg-main px-3 py-2 text-[12px] font-semibold text-muted transition-colors hover:bg-secondary hover:text-main disabled:opacity-60"
                                                >
                                                    <Play size={14} />
                                                    Run Custom
                                                </button>
                                            </>
                                        )}

                                        {restInputError ? (
                                            <div className="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">
                                                {restInputError}
                                            </div>
                                        ) : null}

                                        <div className="rounded-md border border-main bg-main p-2 text-[11px] text-muted">
                                            <div className="mb-1 font-semibold text-main">
                                                Coverage notes
                                            </div>
                                            {DNSE_UNDOCUMENTED_SAMPLE_NOTES.map(
                                                (note) => (
                                                    <div key={note}>- {note}</div>
                                                ),
                                            )}
                                        </div>
                                    </div>

                                    <div className="overflow-hidden rounded-lg border border-main bg-black/30">
                                        <div className="border-b border-main px-3 py-2 text-[11px] font-mono text-muted">
                                            REST Result
                                        </div>
                                        <div className="max-h-[72vh] overflow-auto p-3">
                                            {restBusy ? (
                                                <div className="text-[12px] text-muted">
                                                    Running request...
                                                </div>
                                            ) : restResult ? (
                                                <>
                                                    <div className="mb-2 text-[12px]">
                                                        <span
                                                            className={cn(
                                                                "font-semibold",
                                                                restResult.ok
                                                                    ? "text-emerald-400"
                                                                    : "text-rose-400",
                                                            )}
                                                        >
                                                            {restResult.ok
                                                                ? "SUCCESS"
                                                                : "FAILED"}
                                                        </span>
                                                        <span className="ml-2 text-muted">
                                                            {typeof restResult.elapsedMs ===
                                                            "number"
                                                                ? `${restResult.elapsedMs} ms`
                                                                : ""}
                                                        </span>
                                                    </div>
                                                    <pre className="text-[11px] leading-5 whitespace-pre-wrap break-all">
                                                        {prettyJson(restResult)}
                                                    </pre>
                                                </>
                                            ) : (
                                                <div className="text-[12px] text-muted">
                                                    Chưa có kết quả.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
                                    WebSocket test qua SSE bridge server-side để giữ secret ở
                                    backend. Bạn có thể chọn mọi channel template DNSE hoặc tự
                                    thêm channel custom.
                                </div>

                                <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                                    <label className="flex flex-col gap-1 text-[12px]">
                                        <span className="text-muted">symbols</span>
                                        <input
                                            className="rounded-md border border-main bg-main px-2 py-2"
                                            value={wsSymbolsText}
                                            onChange={(e) =>
                                                setWsSymbolsText(e.target.value)
                                            }
                                            placeholder="HPG,FPT,SSI"
                                            disabled={
                                                streamStatus === "connecting" ||
                                                streamStatus === "connected"
                                            }
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-[12px]">
                                        <span className="text-muted">board</span>
                                        <input
                                            className="rounded-md border border-main bg-main px-2 py-2"
                                            value={wsBoard}
                                            onChange={(e) => setWsBoard(e.target.value)}
                                            disabled={
                                                streamStatus === "connecting" ||
                                                streamStatus === "connected"
                                            }
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-[12px]">
                                        <span className="text-muted">marketIndex</span>
                                        <input
                                            className="rounded-md border border-main bg-main px-2 py-2"
                                            value={wsMarketIndex}
                                            onChange={(e) =>
                                                setWsMarketIndex(e.target.value)
                                            }
                                            disabled={
                                                streamStatus === "connecting" ||
                                                streamStatus === "connected"
                                            }
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-[12px]">
                                        <span className="text-muted">resolution</span>
                                        <input
                                            className="rounded-md border border-main bg-main px-2 py-2"
                                            value={wsResolution}
                                            onChange={(e) =>
                                                setWsResolution(e.target.value)
                                            }
                                            disabled={
                                                streamStatus === "connecting" ||
                                                streamStatus === "connected"
                                            }
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-[12px]">
                                        <span className="text-muted">encoding</span>
                                        <select
                                            className="rounded-md border border-main bg-main px-2 py-2"
                                            value={wsEncoding}
                                            onChange={(e) =>
                                                setWsEncoding(
                                                    e.target.value as
                                                        | "json"
                                                        | "msgpack",
                                                )
                                            }
                                            disabled={
                                                streamStatus === "connecting" ||
                                                streamStatus === "connected"
                                            }
                                        >
                                            <option value="json">json</option>
                                            <option value="msgpack">msgpack</option>
                                        </select>
                                    </label>
                                </div>

                                <div className="rounded-md border border-main bg-secondary/10 p-3">
                                    <div className="mb-2 text-[12px] font-semibold text-main">
                                        Channel subscriptions
                                    </div>
                                    <div className="mb-1 text-[11px] text-muted">
                                        Market channels
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                        {DNSE_MARKET_WS_CHANNEL_TEMPLATES.map((channel) => (
                                            <label
                                                key={channel}
                                                className="inline-flex items-center gap-2 text-[12px] text-muted"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={wsSelectedChannels.includes(
                                                        channel,
                                                    )}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setWsSelectedChannels((prev) =>
                                                                Array.from(
                                                                    new Set([
                                                                        ...prev,
                                                                        channel,
                                                                    ]),
                                                                ),
                                                            );
                                                        } else {
                                                            setWsSelectedChannels((prev) =>
                                                                prev.filter(
                                                                    (c) =>
                                                                        c !== channel,
                                                                ),
                                                            );
                                                        }
                                                    }}
                                                    disabled={
                                                        streamStatus === "connecting" ||
                                                        streamStatus === "connected"
                                                    }
                                                />
                                                <span className="font-mono text-[11px]">
                                                    {channel}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="mt-3 mb-1 text-[11px] text-muted">
                                        Private channels
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                        {DNSE_PRIVATE_WS_CHANNELS.map((channel) => (
                                            <label
                                                key={channel}
                                                className="inline-flex items-center gap-2 text-[12px] text-muted"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={wsSelectedPrivateChannels.includes(
                                                        channel,
                                                    )}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setWsSelectedPrivateChannels(
                                                                (prev) =>
                                                                    Array.from(
                                                                        new Set([
                                                                            ...prev,
                                                                            channel,
                                                                        ]),
                                                                    ),
                                                            );
                                                        } else {
                                                            setWsSelectedPrivateChannels(
                                                                (prev) =>
                                                                    prev.filter(
                                                                        (c) =>
                                                                            c !==
                                                                            channel,
                                                                    ),
                                                            );
                                                        }
                                                    }}
                                                    disabled={
                                                        streamStatus === "connecting" ||
                                                        streamStatus === "connected"
                                                    }
                                                />
                                                <span className="font-mono text-[11px]">
                                                    {channel}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <label className="mt-3 flex flex-col gap-1 text-[12px]">
                                        <span className="text-muted">
                                            Custom channels (comma/newline)
                                        </span>
                                        <textarea
                                            className="min-h-[84px] rounded-md border border-main bg-main px-2 py-2 font-mono text-[11px]"
                                            value={wsCustomChannelsText}
                                            onChange={(e) =>
                                                setWsCustomChannelsText(e.target.value)
                                            }
                                            disabled={
                                                streamStatus === "connecting" ||
                                                streamStatus === "connected"
                                            }
                                            placeholder="market_index.VNINDEX.json"
                                        />
                                    </label>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={connectWs}
                                        disabled={
                                            streamStatus === "connecting" ||
                                            streamStatus === "connected"
                                        }
                                        className="inline-flex items-center gap-2 rounded-md border border-main bg-main px-3 py-2 text-[12px] font-semibold text-muted transition-colors hover:bg-secondary hover:text-main disabled:opacity-50"
                                    >
                                        <Play size={14} />
                                        Connect Stream
                                    </button>
                                    <button
                                        type="button"
                                        onClick={stopWs}
                                        disabled={streamStatus === "idle"}
                                        className="inline-flex items-center gap-2 rounded-md border border-main bg-main px-3 py-2 text-[12px] font-semibold text-muted transition-colors hover:bg-secondary hover:text-main disabled:opacity-50"
                                    >
                                        <Square size={14} />
                                        Stop
                                    </button>
                                    <span className="ml-auto text-[12px] text-muted">
                                        Status:{" "}
                                        <span
                                            className={cn(
                                                "font-semibold uppercase",
                                                streamStatus === "connected"
                                                    ? "text-emerald-400"
                                                    : streamStatus === "connecting"
                                                      ? "text-amber-400"
                                                      : streamStatus === "error"
                                                        ? "text-rose-400"
                                                        : "text-muted",
                                            )}
                                        >
                                            {streamStatus}
                                        </span>
                                    </span>
                                    <span className="text-[12px] text-muted">
                                        Messages: {wsMessageCount}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1fr]">
                                    <div className="overflow-hidden rounded-lg border border-main bg-black/30">
                                        <div className="border-b border-main px-3 py-2 text-[11px] font-mono text-muted">
                                            latest payload
                                        </div>
                                        <pre className="max-h-[58vh] overflow-auto p-3 text-[12px] leading-5">
                                            {prettyJson(wsLastMessage)}
                                        </pre>
                                    </div>

                                    <div className="overflow-hidden rounded-lg border border-main bg-main/40">
                                        <div className="border-b border-main px-3 py-2 text-[11px] font-mono text-muted">
                                            event log (newest first)
                                        </div>
                                        <div className="max-h-[58vh] overflow-auto">
                                            {wsLogs.length === 0 ? (
                                                <div className="p-3 text-[12px] text-muted">
                                                    No events yet.
                                                </div>
                                            ) : (
                                                wsLogs.map((log, idx) => (
                                                    <div
                                                        key={`${log.at}-${idx}`}
                                                        className="border-b border-main/40 p-3"
                                                    >
                                                        <div className="font-mono text-[11px] text-muted">
                                                            {log.at}
                                                        </div>
                                                        <div
                                                            className={cn(
                                                                "mt-1 text-[12px] font-semibold",
                                                                logKindClass(log.kind),
                                                            )}
                                                        >
                                                            {log.title}
                                                        </div>
                                                        <pre className="mt-1 whitespace-pre-wrap break-all text-[11px] leading-5">
                                                            {prettyJson(log.data)}
                                                        </pre>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 rounded-md border border-main bg-main/40 px-3 py-2 text-[12px] text-muted">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <div>
                                Console này bao phủ toàn bộ API preset hiện có trong
                                SDK/docs trong repo và hỗ trợ Custom mode để test endpoint
                                bất kỳ (đảm bảo không bị thiếu API ngoài preset).
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <TickerBar />
        </div>
    );
}
