import type {
    DataStreamEvent,
    DataStreamFundingEvent,
    DataStreamTradeEvent,
    DataStreamMarketType,
} from "../../lib/dataStream/types";

function tokenFromPair(pair: string): string {
    // This app focuses on USDT pairs today.
    const upper = pair.toUpperCase();
    if (upper.endsWith("USDT")) return upper.slice(0, -4);
    return upper;
}

function safeNum(v: unknown): number | null {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

export function normalizeBinanceSpotTradeEvent(
    msg: any,
    pair: string,
): DataStreamTradeEvent | null {
    // Binance spot trade stream payload examples:
    // {
    //   e:"trade", E:..., s:"BTCUSDT", t:..., p:"42580.00", q:"0.5", b:..., a:...,
    //   T:..., m:true, M:true
    // }
    if (!msg || msg.e !== "trade" || !msg.s || !msg.T) return null;

    const price = safeNum(msg.p);
    const qty = safeNum(msg.q);
    if (price === null || qty === null) return null;

    const isBuyerMaker = Boolean(msg.m); // "m": buyer is maker => buyer is not taker => side swap
    const side: "buy" | "sell" = isBuyerMaker ? "sell" : "buy";

    const usdValue = price * qty;
    return {
        kind: "trade",
        marketType: "spot",
        pair,
        token: tokenFromPair(pair),
        side,
        usdValue,
        price,
        qty,
        tradeId: typeof msg.t === "number" ? String(msg.t) : undefined,
        eventTimeMs: typeof msg.T === "number" ? msg.T : Number(msg.T),
        source: "Binance Spot",
    };
}

export function normalizeBinanceFuturesTradeEvent(
    msg: any,
    pair: string,
    sourceLabel = "Binance Futures",
): DataStreamTradeEvent | null {
    // Binance USD-M futures trade payload is very similar:
    // { e:"trade", E:..., s:"BTCUSDT", t:..., p:"42580.00", q:"0.5", T:..., m:true, M:true, ... }
    if (!msg || msg.e !== "trade" || !msg.s || !msg.T) return null;

    const price = safeNum(msg.p);
    const qty = safeNum(msg.q);
    if (price === null || qty === null) return null;

    const isBuyerMaker = Boolean(msg.m);
    const side: "buy" | "sell" = isBuyerMaker ? "sell" : "buy";

    const usdValue = price * qty;
    return {
        kind: "trade",
        marketType: "futures",
        pair,
        token: tokenFromPair(pair),
        side,
        usdValue,
        price,
        qty,
        tradeId: typeof msg.t === "number" ? String(msg.t) : undefined,
        eventTimeMs: typeof msg.T === "number" ? msg.T : Number(msg.T),
        source: sourceLabel,
    };
}

export function normalizeBinanceFuturesMarkPriceEvent(
    msg: any,
    pair: string,
): DataStreamFundingEvent | null {
    // Mark price stream payload includes:
    // { e:"markPriceUpdate", E:..., s:"BTCUSDT", i:"...", p:"...", r:"0.0001", T:..., ... }
    if (!msg || !msg.s) return null;

    const fundingRateDecimal = safeNum(msg.r);
    const nextFundingTimeMs = safeNum(msg.T);
    if (fundingRateDecimal === null || nextFundingTimeMs === null) return null;

    const markPrice = safeNum(msg.p) ?? undefined;
    const indexPrice = safeNum(msg.i) ?? undefined;

    return {
        kind: "funding",
        marketType: "futures",
        pair,
        token: tokenFromPair(pair),
        fundingRateDecimal,
        markPrice,
        indexPrice,
        nextFundingTimeMs,
        eventTimeMs: typeof msg.E === "number" ? msg.E : Date.now(),
        source: "Binance Futures",
    };
}

export function normalizeBinanceEvent(
    msg: any,
    pair: string,
    marketType: DataStreamMarketType,
): DataStreamEvent | null {
    if (!msg) return null;
    // For marking events, `msg` usually carries `r` (funding rate).
    if (marketType === "futures" && typeof msg.r !== "undefined") {
        return normalizeBinanceFuturesMarkPriceEvent(msg, pair);
    }

    if (marketType === "spot") {
        return normalizeBinanceSpotTradeEvent(msg, pair);
    }
    return normalizeBinanceFuturesTradeEvent(msg, pair);
}

