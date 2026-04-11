"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMarket } from "../context/MarketContext";
import { useUniverse } from "../context/UniverseContext";
import {
    binanceService,
    type BinanceRecentTrade,
} from "../services/binanceService";
import type {
    DataStreamConfig,
    DataStreamEvent,
    DataStreamMarketType,
    DataStreamMetrics,
    DataStreamWorkerStateMessage,
} from "../lib/dataStream/types";
import {
    normalizeBinanceFuturesMarkPriceEvent,
    normalizeBinanceFuturesTradeEvent,
    normalizeBinanceSpotTradeEvent,
} from "../services/dataStream/normalizeBinanceEvent";
import { resolveUniverseSymbol } from "../lib/universeSymbol";
import { DataStreamEngine } from "../lib/dataStream/dataStreamEngine";

const DEFAULT_CONFIG: DataStreamConfig = {
    minVolumeUsd: 1_000,
    highlightUsd: 50_000,
    showBuy: true,
    showSell: true,
    showFunding: true,
    showHighlightOnly: false,
    maxRecords: 250,
};
const SNAPSHOT_TRADE_LIMIT = 1000;
const FLUSH_MS = 150;

function tokenFromPair(pair: string): string {
    const upper = pair.toUpperCase();
    if (upper.endsWith("USDT")) return upper.slice(0, -4);
    return upper;
}

function beepTing() {
    try {
        const AudioCtx =
            (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.value = 0.0001;

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

        osc.start(now);
        osc.stop(now + 0.1);

        setTimeout(() => ctx.close?.(), 250);
    } catch {
        // Ignore audio errors.
    }
}

export type DataStreamConnectionStatus =
    | "connecting"
    | "connected"
    | "disconnected"
    | "error";

type DataStreamWsController = {
    tradesWs?: WebSocket;
    fundingWs?: WebSocket;
};

function applyStateMessage(
    msg: DataStreamWorkerStateMessage,
    setters: {
        setRecords: (r: unknown[]) => void;
        setMetrics: (m: DataStreamMetrics) => void;
        setHighlightSeq: (n: number) => void;
        setLastHighlightRecordId: (id: string | undefined) => void;
    },
) {
    setters.setRecords(msg.records);
    setters.setMetrics(msg.metrics);
    setters.setHighlightSeq(msg.highlightSeq);
    setters.setLastHighlightRecordId(msg.lastHighlightRecordId);
}

export function useDataStream() {
    const { selectedSymbol, marketType } = useMarket();
    const { universe, isHydrated = true } = useUniverse();
    const {
        normalized: resolvedSelectedSymbol,
        isValid: hasValidSelectedSymbol,
    } = resolveUniverseSymbol(selectedSymbol, universe);

    const [config, setConfig] = useState<DataStreamConfig>(DEFAULT_CONFIG);
    const [records, setRecords] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<DataStreamMetrics>({
        eventRate10s: 0,
        buyUsd30s: 0,
        sellUsd30s: 0,
        buyUsd2m: 0,
        sellUsd2m: 0,
        highlightCount2m: 0,
        panicScore: 0.5,
        fomoScore: 0.5,
    });

    const [highlightSeq, setHighlightSeq] = useState(0);
    const [lastHighlightRecordId, setLastHighlightRecordId] = useState<
        string | undefined
    >(undefined);

    const [connectionStatus, setConnectionStatus] =
        useState<DataStreamConnectionStatus>("connecting");
    const [error, setError] = useState<string | null>(null);

    const engineRef = useRef<DataStreamEngine | null>(null);
    const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const wsRef = useRef<DataStreamWsController>({});
    const backoffRef = useRef(1000);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const connectionAttemptIdRef = useRef(0);
    const mountedRef = useRef(true);

    const [soundEnabled, setSoundEnabled] = useState(false);
    const [soundArmed, setSoundArmed] = useState(false);

    const pair = resolvedSelectedSymbol ?? "";
    const pairLower = pair.toLowerCase();

    const market: DataStreamMarketType = marketType;

    const soundToggle = useCallback(() => {
        setSoundArmed(true);
        setSoundEnabled((prev) => {
            const next = !prev;
            if (next) {
                setTimeout(() => beepTing(), 0);
            }
            return next;
        });
    }, []);

    const flushFromEngine = useCallback(() => {
        const eng = engineRef.current;
        if (!eng) return;
        const msg = eng.flush();
        if (!msg) return;
        applyStateMessage(msg, {
            setRecords,
            setMetrics,
            setHighlightSeq,
            setLastHighlightRecordId,
        });
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            if (flushIntervalRef.current) {
                clearInterval(flushIntervalRef.current);
                flushIntervalRef.current = null;
            }
            wsRef.current.tradesWs?.close();
            wsRef.current.fundingWs?.close();
            engineRef.current = null;
        };
    }, []);

    // Engine + periodic flush (same cadence as former worker).
    useEffect(() => {
        const eng = new DataStreamEngine();
        eng.init(config);
        engineRef.current = eng;

        const initial = eng.flush();
        if (initial) {
            applyStateMessage(initial, {
                setRecords,
                setMetrics,
                setHighlightSeq,
                setLastHighlightRecordId,
            });
        }

        flushIntervalRef.current = setInterval(() => {
            flushFromEngine();
        }, FLUSH_MS);

        return () => {
            if (flushIntervalRef.current) {
                clearInterval(flushIntervalRef.current);
                flushIntervalRef.current = null;
            }
            engineRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const eng = engineRef.current;
        if (!eng) return;
        eng.setConfig(config);
        flushFromEngine();
    }, [config, flushFromEngine]);

    const postEventToEngine = useCallback((event: DataStreamEvent) => {
        engineRef.current?.pushEvent(event);
    }, []);

    const pushSnapshotTrades = useCallback(
        async (attemptId: number) => {
            if (!isHydrated) return;
            if (universe !== "coin") return;
            if (!hasValidSelectedSymbol || !resolvedSelectedSymbol) return;

            const getRecentTrades =
                market === "futures"
                    ? binanceService.getFuturesRecentTrades.bind(binanceService)
                    : binanceService.getRecentTrades.bind(binanceService);

            const raw = await getRecentTrades(
                resolvedSelectedSymbol,
                SNAPSHOT_TRADE_LIMIT,
            );
            if (!mountedRef.current) return;
            if (attemptId !== connectionAttemptIdRef.current) return;

            const eng = engineRef.current;
            if (!eng) return;
            eng.reset();

            const ordered = [...raw].sort(
                (a: BinanceRecentTrade, b: BinanceRecentTrade) =>
                    a.time - b.time,
            );

            for (const t of ordered) {
                const price = Number.parseFloat(t.price);
                const qty = Number.parseFloat(t.qty);
                if (!Number.isFinite(price) || !Number.isFinite(qty)) continue;

                const event: DataStreamEvent = {
                    kind: "trade",
                    marketType: market,
                    pair: resolvedSelectedSymbol,
                    token: tokenFromPair(resolvedSelectedSymbol),
                    side: t.isBuyerMaker ? "sell" : "buy",
                    usdValue: price * qty,
                    price,
                    qty,
                    tradeId: String(t.id),
                    eventTimeMs: t.time,
                    source:
                        market === "futures"
                            ? "Binance Futures"
                            : "Binance Spot",
                };
                eng.pushEvent(event);
            }
            flushFromEngine();
        },
        [
            hasValidSelectedSymbol,
            isHydrated,
            market,
            flushFromEngine,
            resolvedSelectedSymbol,
            universe,
        ],
    );

    const prevHighlightSeqRef = useRef(0);
    useEffect(() => {
        if (!soundEnabled) return;
        if (highlightSeq <= prevHighlightSeqRef.current) return;
        prevHighlightSeqRef.current = highlightSeq;
        beepTing();
    }, [highlightSeq, soundEnabled]);

    const connect = useCallback(() => {
        if (!isHydrated) {
            wsRef.current.tradesWs?.close();
            wsRef.current.fundingWs?.close();
            wsRef.current = {};
            setConnectionStatus("connecting");
            setError(null);
            return;
        }
        if (universe === "stock") {
            wsRef.current.tradesWs?.close();
            wsRef.current.fundingWs?.close();
            wsRef.current = {};
            engineRef.current?.reset();
            flushFromEngine();
            setConnectionStatus("connected");
            setError(null);
            return;
        }
        if (!hasValidSelectedSymbol || !resolvedSelectedSymbol) {
            wsRef.current.tradesWs?.close();
            wsRef.current.fundingWs?.close();
            wsRef.current = {};
            engineRef.current?.reset();
            flushFromEngine();
            setConnectionStatus("disconnected");
            setError("Invalid coin symbol for stream");
            return;
        }
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        connectionAttemptIdRef.current += 1;
        const attemptId = connectionAttemptIdRef.current;

        wsRef.current.tradesWs?.close();
        wsRef.current.fundingWs?.close();
        wsRef.current = {};

        engineRef.current?.reset();
        flushFromEngine();

        setError(null);
        setConnectionStatus("connecting");

        pushSnapshotTrades(attemptId).catch((err: unknown) => {
            console.error(
                "[useDataStream] Failed to fetch snapshot trades:",
                err,
            );
        });

        const onOpen = () => {
            if (!mountedRef.current) return;
            if (attemptId !== connectionAttemptIdRef.current) return;
            setConnectionStatus("connected");
        };

        const onError = () => {
            if (!mountedRef.current) return;
            if (attemptId !== connectionAttemptIdRef.current) return;
            setConnectionStatus("error");
        };

        const scheduleReconnect = () => {
            if (!mountedRef.current) return;
            if (attemptId !== connectionAttemptIdRef.current) return;

            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            setConnectionStatus("disconnected");
            const wait = backoffRef.current;
            backoffRef.current = Math.min(
                15_000,
                Math.round(backoffRef.current * 1.5),
            );

            reconnectTimerRef.current = setTimeout(() => {
                if (!mountedRef.current) return;
                if (attemptId !== connectionAttemptIdRef.current) return;
                connect();
            }, wait);
        };

        const onTradesClose = () => scheduleReconnect();
        const onFundingClose = () => {
            const tradesReadyState = wsRef.current.tradesWs?.readyState;
            if (tradesReadyState === WebSocket.OPEN) return;
            scheduleReconnect();
        };

        const tradesUrl =
            market === "spot"
                ? `wss://stream.binance.com:9443/ws/${pairLower}@trade`
                : `wss://fstream.binance.com/ws/${pairLower}@trade`;

        const tradesWs = new WebSocket(tradesUrl);
        wsRef.current.tradesWs = tradesWs;

        tradesWs.onopen = () => {
            backoffRef.current = 1000;
            onOpen();
        };

        tradesWs.onerror = onError;
        tradesWs.onclose = onTradesClose;

        tradesWs.onmessage = (ev) => {
            try {
                const msg =
                    typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
                if (!msg) return;

                if (market === "spot") {
                    const e = normalizeBinanceSpotTradeEvent(msg, pair);
                    if (e) postEventToEngine(e);
                } else {
                    const e = normalizeBinanceFuturesTradeEvent(msg, pair);
                    if (e) postEventToEngine(e);
                }
            } catch {
                // Ignore malformed payloads.
            }
        };

        if (market === "futures") {
            const fundingUrl = `wss://fstream.binance.com/market/ws/${pairLower}@markPrice@1s`;
            const fundingWs = new WebSocket(fundingUrl);
            wsRef.current.fundingWs = fundingWs;

            fundingWs.onerror = onError;
            fundingWs.onclose = onFundingClose;
            fundingWs.onopen = () => {};

            fundingWs.onmessage = (ev) => {
                try {
                    const msg =
                        typeof ev.data === "string"
                            ? JSON.parse(ev.data)
                            : ev.data;
                    const e = normalizeBinanceFuturesMarkPriceEvent(msg, pair);
                    if (e) postEventToEngine(e);
                } catch {
                    // ignore
                }
            };
        }
    }, [
        hasValidSelectedSymbol,
        market,
        pair,
        pairLower,
        pushSnapshotTrades,
        postEventToEngine,
        resolvedSelectedSymbol,
        isHydrated,
        universe,
    ]);

    useEffect(() => {
        connect();
        return () => {
            wsRef.current.tradesWs?.close();
            wsRef.current.fundingWs?.close();
        };
    }, [connect]);

    const reset = useCallback(() => {
        engineRef.current?.reset();
        flushFromEngine();
    }, [flushFromEngine]);

    const pause = useCallback(() => {
        wsRef.current.tradesWs?.close();
        wsRef.current.fundingWs?.close();
    }, []);

    const reconnect = useCallback(() => {
        connect();
    }, [connect]);

    const resume = useCallback(() => {
        connect();
    }, [connect]);

    return useMemo(
        () => ({
            config,
            setConfig,
            records,
            metrics,
            connectionStatus,
            error,
            highlightSeq,
            lastHighlightRecordId,
            reset,
            pause,
            reconnect,
            resume,
            soundEnabled,
            soundArmed,
            toggleSoundEnabled: soundToggle,
            selectedSymbol: resolvedSelectedSymbol ?? selectedSymbol,
            marketType: marketType,
            snapshotTradeLimit: SNAPSHOT_TRADE_LIMIT,
            maxRecords: config.maxRecords,
            universe,
        }),
        [
            config,
            records,
            metrics,
            connectionStatus,
            error,
            highlightSeq,
            lastHighlightRecordId,
            reset,
            pause,
            reconnect,
            resume,
            soundEnabled,
            soundArmed,
            soundToggle,
            resolvedSelectedSymbol,
            selectedSymbol,
            marketType,
            config.maxRecords,
            universe,
        ],
    );
}
