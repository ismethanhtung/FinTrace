"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    extractDnseBoardPatches,
    mergeDnseBoardState,
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

export function useDnseBoardStream(
    symbols: string[],
    opts?: {
        board?: string;
        boards?: string[];
        marketIndex?: string;
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

    const normalizedSymbols = useMemo(
        () =>
            Array.from(
                new Set(
                    symbols
                        .map((raw) => normalizeSymbol(raw))
                        .filter((value): value is string => Boolean(value)),
                ),
            ),
        [symbols],
    );
    const streamSymbols = useMemo(
        () => normalizedSymbols.slice(0, MAX_STREAM_SYMBOLS),
        [normalizedSymbols],
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
                        .map((value) => value.trim().toUpperCase())
                        .filter(Boolean),
                ),
            ),
        [opts?.boards],
    );
    const marketIndex = (opts?.marketIndex || "VNINDEX").trim().toUpperCase();
    const resolution = (opts?.resolution || "1").trim().toUpperCase();

    useEffect(() => {
        if (!streamSymbols.length) {
            setDataBySymbol({});
            setStatus("idle");
            return;
        }

        const allowed = new Set(streamSymbols);
        setDataBySymbol((prev) => {
            const next: Record<string, DnseBoardSymbolState> = {};
            for (const symbol of streamSymbols) {
                const existing = prev[symbol];
                if (existing) next[symbol] = existing;
            }
            return next;
        });
        setStatus("connecting");
        setError(null);

        const channels = Array.from(
            new Set([
                ...boards.flatMap((boardCode) => [
                    `security_definition.${boardCode}.json`,
                    `tick.${boardCode}.json`,
                    `tick_extra.${boardCode}.json`,
                    `top_price.${boardCode}.json`,
                    `expected_price.${boardCode}.json`,
                ]),
                `ohlc.${resolution}.json`,
                `market_index.${marketIndex}.json`,
            ]),
        );

        const qs = new URLSearchParams({
            symbols: streamSymbols.join(","),
            board,
            marketIndex,
            resolution,
        });
        if (channels.length) {
            qs.set("channels", channels.join(","));
        }
        const es = new EventSource(`/api/dnse/realtime/stream?${qs.toString()}`);
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
                const patches = extractDnseBoardPatches(payload.data ?? payload);
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
            let message = "DNSE stream error";
            try {
                const payload = JSON.parse((event as MessageEvent).data) as {
                    message?: string;
                    type?: string;
                    error?: string;
                };
                message = payload.message || payload.error || payload.type || message;
            } catch {
                // ignore parse error, keep generic message
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
    }, [board, boards, marketIndex, resolution, streamSymbols]);

    return {
        status,
        error,
        lastUpdatedAt,
        dataBySymbol,
        streamSymbolCount: streamSymbols.length,
        isTruncated,
    };
}
