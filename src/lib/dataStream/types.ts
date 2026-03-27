export type DataStreamMarketType = "spot" | "futures";

export type DataStreamEvent =
    | DataStreamTradeEvent
    | DataStreamFundingEvent
    | DataStreamLiquidationEvent;

export type DataStreamTradeEvent = {
    kind: "trade";
    marketType: DataStreamMarketType;
    pair: string; // e.g. BTCUSDT
    token: string; // e.g. BTC
    side: "buy" | "sell";
    usdValue: number; // p*q
    price: number;
    qty: number;
    tradeId?: string;
    eventTimeMs: number;
    source: string; // "Binance Spot" / "Binance Futures"
};

export type DataStreamFundingEvent = {
    kind: "funding";
    marketType: "futures";
    pair: string;
    token: string;
    fundingRateDecimal: number; // e.g. 0.0001 = 0.01%
    markPrice?: number;
    indexPrice?: number;
    nextFundingTimeMs: number;
    eventTimeMs: number;
    source: string; // "Binance Futures"
};

export type DataStreamLiquidationEvent = {
    kind: "liquidation";
    marketType: "futures";
    pair: string;
    token: string;
    side: "buy" | "sell";
    orderType: string;
    status?: string;
    price: number;
    avgPrice?: number;
    qty: number;
    lastFilledQty?: number;
    accumulatedFilledQty?: number;
    usdValue: number; // price * qty
    eventTimeMs: number;
    tradeTimeMs?: number;
    source: string; // "Binance Futures"
};

export type StreamRecordTone = "up" | "down" | "accent" | "neutral";

export type StreamRecord = {
    id: string;
    timeLabel: string; // HH:MM:SS
    action: string; // BUY/SELL/HIGHLIGHT/FUNDING
    token: string;
    valueText: string; // "$12.3K" or "+0.0123%" etc
    source: string;
    details?: string;
    tone: StreamRecordTone;
};

export type DataStreamMetrics = {
    eventRate10s: number; // events/sec in last 10s
    buyUsd30s: number;
    sellUsd30s: number;
    buyUsd2m: number;
    sellUsd2m: number;
    highlightCount2m: number;
    panicScore: number; // 0..1 (sell-dominant + fast)
    fomoScore: number; // 0..1 (buy-dominant + fast)
};

export type DataStreamConfig = {
    minVolumeUsd: number; // show trade events where usdValue >= minVolumeUsd
    highlightUsd: number; // highlight BUY where usdValue >= highlightUsd
    showBuy: boolean;
    showSell: boolean;
    showFunding: boolean;
    // If true, only HIGHLIGHT records will be shown (no BUY/SELL/FUNDING records).
    showHighlightOnly: boolean;
    maxRecords: number;
};

export type DataStreamWorkerInitMessage = {
    type: "INIT";
    config: DataStreamConfig;
};

export type DataStreamWorkerConfigMessage = {
    type: "CONFIG";
    config: DataStreamConfig;
};

export type DataStreamWorkerEventMessage = {
    type: "EVENT";
    event: DataStreamEvent;
};

export type DataStreamWorkerResetMessage = {
    type: "RESET";
};

export type DataStreamWorkerClientMessage =
    | DataStreamWorkerInitMessage
    | DataStreamWorkerConfigMessage
    | DataStreamWorkerEventMessage
    | DataStreamWorkerResetMessage;

export type DataStreamWorkerStateMessage = {
    type: "STATE";
    records: StreamRecord[]; // newest-first
    metrics: DataStreamMetrics;
    highlightSeq: number;
    lastHighlightRecordId?: string;
};
