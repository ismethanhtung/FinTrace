"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMarket } from "../context/MarketContext";
import type {
    DataStreamConfig,
    DataStreamEvent,
    DataStreamMetrics,
    DataStreamWorkerClientMessage,
    DataStreamWorkerStateMessage,
} from "../lib/dataStream/types";
import type { DataStreamMarketType } from "../lib/dataStream/types";
import {
    normalizeBinanceFuturesMarkPriceEvent,
    normalizeBinanceFuturesTradeEvent,
    normalizeBinanceSpotTradeEvent,
} from "../services/dataStream/normalizeBinanceEvent";


const DEFAULT_CONFIG: DataStreamConfig = {
    minVolumeUsd: 10_000,
    highlightUsd: 50_000,
    showBuy: true,
    showSell: true,
    showFunding: true,
    maxRecords: 100,
};

function tokenFromPair(pair: string): string {
    const upper = pair.toUpperCase();
    if (upper.endsWith("USDT")) return upper.slice(0, -4);
    return upper;
}

function beepTing() {
    // Short "ting" using WebAudio (no external asset).
    try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
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

export function useDataStream() {
    const { selectedSymbol, marketType } = useMarket();

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
    const [lastHighlightRecordId, setLastHighlightRecordId] = useState<string | undefined>(undefined);

    const [connectionStatus, setConnectionStatus] =
        useState<DataStreamConnectionStatus>("connecting");
    const [error, setError] = useState<string | null>(null);

    const workerRef = useRef<Worker | null>(null);
    const wsRef = useRef<DataStreamWsController>({});
    const backoffRef = useRef(1000);
    const mountedRef = useRef(true);

    const [soundEnabled, setSoundEnabled] = useState(false);
    const [soundArmed, setSoundArmed] = useState(false);

    const pair = selectedSymbol;
    const pairLower = pair.toLowerCase();

    const market: DataStreamMarketType = marketType;

    const soundToggle = useCallback(() => {
        // First click arms sound (browser requires gesture).
        setSoundArmed(true);
        setSoundEnabled((prev) => {
            const next = !prev;
            if (next) {
                setTimeout(() => beepTing(), 0);
            }
            return next;
        });
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            wsRef.current.tradesWs?.close();
            wsRef.current.fundingWs?.close();
            workerRef.current?.terminate();
        };
    }, []);

    // Worker lifecycle (init once).
    useEffect(() => {
        if (workerRef.current) return;

        try {
            const worker = new Worker(
                new URL("../workers/dataStreamWorker.ts", import.meta.url),
                { type: "module" },
            );
            workerRef.current = worker;

            worker.onmessage = (event: MessageEvent<DataStreamWorkerStateMessage>) => {
                const msg = event.data;
                if (!msg || msg.type !== "STATE") return;
                setRecords(msg.records);
                setMetrics(msg.metrics);
                setHighlightSeq(msg.highlightSeq);
                setLastHighlightRecordId(msg.lastHighlightRecordId);
            };

            const initMsg: DataStreamWorkerClientMessage = { type: "INIT", config };
            worker.postMessage(initMsg);
        } catch (err: unknown) {
            console.error("[useDataStream] Failed to init worker:", err);
            setConnectionStatus("error");
            setError("Không khởi tạo được Web Worker. Hãy thử reload hoặc kiểm tra build config.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Push config updates to worker.
    useEffect(() => {
        const w = workerRef.current;
        if (!w) return;
        const msg: DataStreamWorkerClientMessage = { type: "CONFIG", config };
        w.postMessage(msg);
    }, [config]);

    const postEventToWorker = useCallback((event: DataStreamEvent) => {
        const w = workerRef.current;
        if (!w) return;
        const msg: DataStreamWorkerClientMessage = { type: "EVENT", event };
        w.postMessage(msg);
    }, []);

    // Sound effect when highlight sequence changes.
    const prevHighlightSeqRef = useRef(0);
    useEffect(() => {
        if (!soundEnabled) return;
        if (highlightSeq <= prevHighlightSeqRef.current) return;
        prevHighlightSeqRef.current = highlightSeq;
        beepTing();
    }, [highlightSeq, soundEnabled]);

    const connect = useCallback(() => {
        // Close any existing sockets.
        wsRef.current.tradesWs?.close();
        wsRef.current.fundingWs?.close();
        wsRef.current = {};

        setError(null);
        setConnectionStatus("connecting");

        const onOpen = () => {
            if (!mountedRef.current) return;
            setConnectionStatus("connected");
        };

        const onError = () => {
            if (!mountedRef.current) return;
            setConnectionStatus("error");
        };

        const scheduleReconnect = () => {
            if (!mountedRef.current) return;
            setConnectionStatus("disconnected");
            // Reconnect with backoff for better UX.
            const wait = backoffRef.current;
            backoffRef.current = Math.min(
                15_000,
                Math.round(backoffRef.current * 1.5),
            );

            setTimeout(() => {
                if (!mountedRef.current) return;
                connect();
            }, wait);
        };

        const onTradesClose = () => scheduleReconnect();
        const onFundingClose = () => {
            // Avoid reconnect loop if funding WS closes while trades WS is still alive.
            const tradesReadyState = wsRef.current.tradesWs?.readyState;
            if (tradesReadyState === WebSocket.OPEN) return;
            scheduleReconnect();
        };

        // Trades WS.
        const tradesUrl =
            market === "spot"
                ? `wss://stream.binance.com:9443/ws/${pairLower}@trade`
                : `wss://fstream.binance.com/ws/${pairLower}@trade`;

        const tradesWs = new WebSocket(tradesUrl);
        wsRef.current.tradesWs = tradesWs;

        tradesWs.onopen = () => {
            backoffRef.current = 1000; // reset
            onOpen();
        };

        tradesWs.onerror = onError;
        tradesWs.onclose = onTradesClose;

        tradesWs.onmessage = (ev) => {
            try {
                const msg = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
                if (!msg) return;

                if (market === "spot") {
                    const e = normalizeBinanceSpotTradeEvent(msg, pair);
                    if (e) postEventToWorker(e);
                } else {
                    const e = normalizeBinanceFuturesTradeEvent(msg, pair);
                    if (e) postEventToWorker(e);
                }
            } catch (err) {
                // Ignore malformed payloads.
            }
        };

        // Funding WS (futures only).
        if (market === "futures") {
            // Mark price stream also carries funding rate.
            const fundingUrl = `wss://fstream.binance.com/market/ws/${pairLower}@markPrice@1s`;
            const fundingWs = new WebSocket(fundingUrl);
            wsRef.current.fundingWs = fundingWs;

            fundingWs.onerror = onError;
            fundingWs.onclose = onFundingClose;
            fundingWs.onopen = () => {
                // Keep status connected only when trades open already.
            };

            fundingWs.onmessage = (ev) => {
                try {
                    const msg = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
                    const e = normalizeBinanceFuturesMarkPriceEvent(msg, pair);
                    if (e) postEventToWorker(e);
                } catch {
                    // ignore
                }
            };
        }
    }, [market, pair, pairLower, postEventToWorker]);

    // Reconnect when selected symbol or market type changes.
    useEffect(() => {
        connect();
        return () => {
            wsRef.current.tradesWs?.close();
            wsRef.current.fundingWs?.close();
        };
    }, [connect]);

    const reset = useCallback(() => {
        const w = workerRef.current;
        if (!w) return;
        const msg: DataStreamWorkerClientMessage = { type: "RESET" };
        w.postMessage(msg);
    }, []);

    const pause = useCallback(() => {
        // For now we simply close sockets (keep worker).
        wsRef.current.tradesWs?.close();
        wsRef.current.fundingWs?.close();
    }, []);

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
            resume,
            soundEnabled,
            soundArmed,
            toggleSoundEnabled: soundToggle,
            selectedSymbol: selectedSymbol,
            marketType: marketType,
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
            resume,
            soundEnabled,
            soundArmed,
            soundToggle,
            selectedSymbol,
            marketType,
        ],
    );
}

