"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    extractDnseBoardPatches,
    extractDnseMarketIndexPatches,
    mergeDnseBoardState,
    mergeDnseMarketIndexState,
    type DnseMarketIndexState,
    type DnseBoardSymbolState,
} from "../lib/dnse/boardRealtime";

type DnseBoardStreamStatus =
    | "idle"
    | "connecting"
    | "connected"
    | "disconnected"
    | "error";

type DnseInfoEvent = {
    type?: string;
    [key: string]: unknown;
};

const MAX_STREAM_SYMBOLS = 300;
const DEFAULT_CHANNEL_BOARDS = ["G1", "G2", "G3"] as const;

function normalizeSymbol(raw: string): string | null {
    const symbol = raw.trim().toUpperCase();
    if (!symbol) return null;
    if (!/^[A-Z0-9]{1,24}$/.test(symbol)) return null;
    return symbol;
}

function normalizeBoardCode(raw: string): string | null {
    const board = raw.trim().toUpperCase();
    if (!board) return null;
    if (!/^[A-Z0-9_]{1,24}$/.test(board)) return null;
    return board;
}

export function useDnseBoardStream(
    symbols: string[],
    opts?: {
        board?: string;
        boards?: string[];
        marketIndex?: string;
        marketIndexes?: string[];
        resolution?: string;
    },
) {
    const eventSourceRef = useRef<EventSource | null>(null);
    const [status, setStatus] = useState<DnseBoardStreamStatus>("idle");
    const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dataBySymbol, setDataBySymbol] = useState<
        Record<string, DnseBoardSymbolState>
    >({});
    const [dataByMarketIndex, setDataByMarketIndex] = useState<
        Record<string, DnseMarketIndexState>
    >({});

    const normalizedSymbols = useMemo(
        () =>
            Array.from(
                new Set(
                    symbols
                        .map((raw) => normalizeSymbol(raw))
                        .filter((value): value is string => Boolean(value)),
                ),
            ).sort((a, b) => a.localeCompare(b)),
        [symbols],
    );
    const streamSymbols = useMemo(
        () => normalizedSymbols.slice(0, MAX_STREAM_SYMBOLS),
        [normalizedSymbols],
    );
    const streamSymbolsKey = useMemo(
        () => streamSymbols.join(","),
        [streamSymbols],
    );
    const isTruncated = normalizedSymbols.length > streamSymbols.length;
    const board = (opts?.board || "G1").trim().toUpperCase();
    const boards = useMemo(
        () =>
            Array.from(
                new Set(
                    (opts?.boards?.length
                        ? opts.boards
                        : [...DEFAULT_CHANNEL_BOARDS]
                    )
                        .map((value) => normalizeBoardCode(value))
                        .filter((value): value is string => Boolean(value)),
                ),
            ).sort((a, b) => a.localeCompare(b)),
        [opts?.boards],
    );
    const boardsKey = useMemo(() => boards.join(","), [boards]);
    const marketIndex = (opts?.marketIndex || "VNINDEX").trim().toUpperCase();
    const marketIndexes = useMemo(
        () =>
            Array.from(
                new Set(
                    [marketIndex, ...(opts?.marketIndexes ?? [])]
                        .map((value) => value.trim().toUpperCase())
                        .filter((value) => /^[A-Z0-9_]{1,24}$/.test(value)),
                ),
            ).sort((a, b) => a.localeCompare(b)),
        [marketIndex, opts?.marketIndexes],
    );
    const marketIndexesKey = useMemo(
        () => marketIndexes.join(","),
        [marketIndexes],
    );
    const resolution = (opts?.resolution || "1").trim().toUpperCase();

    useEffect(() => {
        const symbolsForStream = streamSymbolsKey
            ? streamSymbolsKey.split(",")
            : [];
        const boardsForChannels = boardsKey ? boardsKey.split(",") : [];

        if (!symbolsForStream.length) {
            setDataBySymbol({});
            setStatus("idle");
            return;
        }

        const allowed = new Set(symbolsForStream);
        setDataBySymbol((prev) => {
            const next: Record<string, DnseBoardSymbolState> = {};
            for (const symbol of symbolsForStream) {
                const existing = prev[symbol];
                if (existing) next[symbol] = existing;
            }
            return next;
        });
        setStatus("connecting");
        setError(null);

        const channels = Array.from(
            new Set([
                ...boardsForChannels.flatMap((boardCode) => [
                    `security_definition.${boardCode}.json`,
                    `tick.${boardCode}.json`,
                    `tick_extra.${boardCode}.json`,
                    `top_price.${boardCode}.json`,
                    `expected_price.${boardCode}.json`,
                ]),
                `ohlc.${resolution}.json`,
                ...marketIndexes.map(
                    (indexName) => `market_index.${indexName}.json`,
                ),
            ]),
        );

        const qs = new URLSearchParams({
            symbols: symbolsForStream.join(","),
            board,
            marketIndex,
            resolution,
        });
        if (channels.length) {
            qs.set("channels", channels.join(","));
        }
        const es = new EventSource(
            `/api/dnse/realtime/stream?${qs.toString()}`,
        );
        eventSourceRef.current = es;

        es.addEventListener("info", (event) => {
            try {
                const payload = JSON.parse(
                    (event as MessageEvent).data,
                ) as DnseInfoEvent;
                const type = String(payload.type || "").toLowerCase();
                if (
                    type === "ws_open" ||
                    type === "auth_success" ||
                    type === "suback" ||
                    type === "subscription_sent"
                ) {
                    setStatus("connected");
                }
                if (type === "ws_close") {
                    setStatus("disconnected");
                }
            } catch {
                // ignore malformed info events
            }
        });

        es.addEventListener("message", (event) => {
            try {
                const payload = JSON.parse((event as MessageEvent).data) as {
                    data?: unknown;
                };
                const patches = extractDnseBoardPatches(
                    payload.data ?? payload,
                );
                const marketIndexPatches = extractDnseMarketIndexPatches(
                    payload.data ?? payload,
                );

                if (marketIndexPatches.length) {
                    setDataByMarketIndex((prev) =>
                        mergeDnseMarketIndexState(prev, marketIndexPatches),
                    );
                    setLastUpdatedAt(Date.now());
                    setStatus("connected");
                }

                if (!patches.length) return;

                const filteredPatches = patches.filter((patch) =>
                    allowed.has(patch.symbol),
                );
                if (!filteredPatches.length) return;

                setDataBySymbol((prev) =>
                    mergeDnseBoardState(prev, filteredPatches),
                );
                setLastUpdatedAt(Date.now());
                setStatus("connected");
            } catch {
                // ignore malformed market events
            }
        });

        es.addEventListener("error", (event) => {
            const asMessageEvent =
                event instanceof MessageEvent ? event : null;
            if (
                !asMessageEvent ||
                typeof asMessageEvent.data !== "string" ||
                !asMessageEvent.data.trim()
            ) {
                if (es.readyState === EventSource.CONNECTING) {
                    setStatus((prev) =>
                        prev === "connected" ? "disconnected" : "connecting",
                    );
                    return;
                }
                if (es.readyState === EventSource.CLOSED) {
                    setStatus("disconnected");
                    return;
                }
                return;
            }

            let message = "DNSE stream error";
            try {
                const payload = JSON.parse(asMessageEvent.data) as {
                    message?: string;
                    type?: string;
                    error?: string;
                };
                message =
                    payload.message || payload.error || payload.type || message;
            } catch {
                // keep default message if payload is not valid json
            }

            setError(message);
            setStatus("error");
        });

        return () => {
            es.close();
            if (eventSourceRef.current === es) {
                eventSourceRef.current = null;
            }
            setStatus((prev) => (prev === "idle" ? prev : "disconnected"));
        };
    }, [
        board,
        boardsKey,
        marketIndex,
        marketIndexesKey,
        resolution,
        streamSymbolsKey,
    ]);

    return {
        status,
        error,
        lastUpdatedAt,
        dataBySymbol,
        dataByMarketIndex,
        streamSymbolCount: streamSymbols.length,
        isTruncated,
    };
}
