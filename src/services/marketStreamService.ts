import type { Asset, MarketType, OhlcvPoint } from "./binanceService";

export type MarketStreamStatus =
    | "connecting"
    | "connected"
    | "disconnected"
    | "error";

type StreamSubscriber<T> = {
    id: number;
    onMessage: (value: T) => void;
    onStatus?: (status: MarketStreamStatus) => void;
};

type StreamConnection<T> = {
    key: string;
    url: string;
    parser: (raw: any) => T | null;
    ws: WebSocket | null;
    status: MarketStreamStatus;
    backoffMs: number;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
    nextSubscriberId: number;
    subscribers: Map<number, StreamSubscriber<T>>;
    open: () => void;
    close: () => void;
    reconnect: () => void;
};

const connections = new Map<string, StreamConnection<any>>();

function getWebSocketCtor(): typeof WebSocket | null {
    if (typeof window === "undefined") return null;
    return window.WebSocket ?? null;
}

function broadcastStatus<T>(conn: StreamConnection<T>, status: MarketStreamStatus) {
    conn.status = status;
    for (const sub of conn.subscribers.values()) {
        sub.onStatus?.(status);
    }
}

function createConnection<T>(
    key: string,
    url: string,
    parser: (raw: any) => T | null,
): StreamConnection<T> {
    const conn: StreamConnection<T> = {
        key,
        url,
        parser,
        ws: null,
        status: "connecting",
        backoffMs: 1_000,
        reconnectTimer: null,
        nextSubscriberId: 1,
        subscribers: new Map(),
        open: () => {
            const WebSocketCtor = getWebSocketCtor();
            if (!WebSocketCtor) {
                broadcastStatus(conn, "error");
                return;
            }

            if (conn.reconnectTimer) {
                clearTimeout(conn.reconnectTimer);
                conn.reconnectTimer = null;
            }

            if (!conn.subscribers.size) {
                return;
            }

            broadcastStatus(conn, "connecting");

            try {
                conn.ws?.close();
            } catch {
                // ignore stale socket close errors
            }

            const ws = new WebSocketCtor(url);
            conn.ws = ws;

            ws.onopen = () => {
                conn.backoffMs = 1_000;
                broadcastStatus(conn, "connected");
            };

            ws.onerror = () => {
                broadcastStatus(conn, "error");
            };

            ws.onmessage = (ev) => {
                try {
                    const raw =
                        typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
                    const parsed = conn.parser(raw);
                    if (parsed == null) return;
                    for (const sub of conn.subscribers.values()) {
                        sub.onMessage(parsed);
                    }
                } catch {
                    // Ignore malformed frames.
                }
            };

            ws.onclose = () => {
                conn.ws = null;
                if (!conn.subscribers.size) {
                    broadcastStatus(conn, "disconnected");
                    return;
                }

                broadcastStatus(conn, "disconnected");
                const wait = conn.backoffMs;
                conn.backoffMs = Math.min(15_000, Math.round(conn.backoffMs * 1.6));

                conn.reconnectTimer = setTimeout(() => {
                    conn.reconnectTimer = null;
                    if (conn.subscribers.size) {
                        conn.open();
                    }
                }, wait);
            };
        },
        close: () => {
            if (conn.reconnectTimer) {
                clearTimeout(conn.reconnectTimer);
                conn.reconnectTimer = null;
            }
            try {
                conn.ws?.close();
            } catch {
                // ignore
            }
            conn.ws = null;
            broadcastStatus(conn, "disconnected");
        },
        reconnect: () => {
            conn.close();
            if (conn.subscribers.size) {
                conn.backoffMs = 1_000;
                conn.open();
            }
        },
    };

    connections.set(key, conn);
    return conn;
}

function getOrCreateConnection<T>(
    key: string,
    url: string,
    parser: (raw: any) => T | null,
): StreamConnection<T> {
    const existing = connections.get(key) as StreamConnection<T> | undefined;
    if (existing) return existing;
    return createConnection(key, url, parser);
}

export type StreamSubscription = {
    unsubscribe: () => void;
    reconnect: () => void;
    getStatus: () => MarketStreamStatus;
};

export function subscribeSharedStream<T>({
    key,
    url,
    parser,
    onMessage,
    onStatus,
}: {
    key: string;
    url: string;
    parser: (raw: any) => T | null;
    onMessage: (value: T) => void;
    onStatus?: (status: MarketStreamStatus) => void;
}): StreamSubscription {
    const conn = getOrCreateConnection<T>(key, url, parser);
    const id = conn.nextSubscriberId++;
    conn.subscribers.set(id, { id, onMessage, onStatus });
    onStatus?.(conn.status);

    if (conn.subscribers.size === 1) {
        conn.open();
    } else if (conn.status === "disconnected" || conn.status === "error") {
        conn.open();
    }

    return {
        unsubscribe: () => {
            conn.subscribers.delete(id);
            if (!conn.subscribers.size) {
                conn.close();
                connections.delete(key);
            }
        },
        reconnect: () => conn.reconnect(),
        getStatus: () => conn.status,
    };
}

export type MarketMiniTicker = {
    s: string;
    c: string;
    o: string;
    h: string;
    l: string;
    v: string;
    q: string;
    E?: number;
};

export function mergeMiniTickerIntoAsset(
    asset: Asset,
    ticker: MarketMiniTicker,
): Asset {
    const open = Number.parseFloat(ticker.o);
    const close = Number.parseFloat(ticker.c);
    const high = Number.parseFloat(ticker.h);
    const low = Number.parseFloat(ticker.l);
    const baseVolume = Number.parseFloat(ticker.v);
    const quoteVolumeRaw = Number.parseFloat(ticker.q);

    const change =
        Number.isFinite(close) && Number.isFinite(open) ? close - open : asset.change;
    const changePercent =
        Number.isFinite(close) && Number.isFinite(open) && open !== 0
            ? ((close - open) / open) * 100
            : asset.changePercent;

    return {
        ...asset,
        price: Number.isFinite(close) ? close : asset.price,
        change,
        changePercent,
        high24h: Number.isFinite(high) ? high : asset.high24h,
        low24h: Number.isFinite(low) ? low : asset.low24h,
        baseVolume: Number.isFinite(baseVolume) ? baseVolume : asset.baseVolume,
        quoteVolumeRaw: Number.isFinite(quoteVolumeRaw)
            ? quoteVolumeRaw
            : asset.quoteVolumeRaw,
        volume24h: Number.isFinite(quoteVolumeRaw)
            ? `$${(quoteVolumeRaw / 1_000_000).toFixed(1)}M`
            : asset.volume24h,
    };
}

export function mergeMiniTickerArray(
    prev: Asset[],
    tickers: MarketMiniTicker[],
    marketType: MarketType,
    opts?: { resort?: boolean },
): Asset[] {
    if (!tickers.length) return prev;
    const byId = new Map(prev.map((asset) => [asset.id, asset]));

    for (const ticker of tickers) {
        const existing = byId.get(ticker.s);
        if (!existing) continue;
        byId.set(ticker.s, mergeMiniTickerIntoAsset(existing, ticker));
    }

    const next = [...byId.values()];
    if (opts?.resort !== false) {
        next.sort((a, b) => b.quoteVolumeRaw - a.quoteVolumeRaw);
    }
    return next.map((asset) => ({
        ...asset,
        marketType,
    }));
}

export type TradeStreamEvent = {
    e: "trade";
    E?: number;
    s: string;
    t?: number;
    p: string;
    q: string;
    T: number;
    m: boolean;
};

export type KlineStreamEvent = {
    e: "kline";
    E?: number;
    s: string;
    k: {
        t: number;
        T: number;
        s: string;
        i: string;
        o: string;
        h: string;
        l: string;
        c: string;
        v: string;
        x: boolean;
    };
};

export type MarkPriceStreamEvent = {
    e: "markPriceUpdate";
    E?: number;
    s: string;
    p: string;
    i: string;
    r: string;
    T: number;
};

export type DepthDiffStreamEvent = {
    e?: string;
    E?: number;
    s?: string;
    U: number;
    u: number;
    pu?: number;
    b?: [string, string][];
    a?: [string, string][];
};

export type NormalizedTrade = {
    id: number;
    price: number;
    qty: number;
    time: number;
    isBuy: boolean;
};

export function normalizeTradeStreamEvent(
    raw: TradeStreamEvent,
): NormalizedTrade | null {
    if (!raw || raw.e !== "trade") return null;
    const price = Number.parseFloat(raw.p);
    const qty = Number.parseFloat(raw.q);
    if (!Number.isFinite(price) || !Number.isFinite(qty)) return null;
    return {
        id: typeof raw.t === "number" ? raw.t : raw.T,
        price,
        qty,
        time: raw.T,
        isBuy: !raw.m,
    };
}

export function normalizeKlineStreamEvent(raw: KlineStreamEvent): OhlcvPoint | null {
    if (!raw || raw.e !== "kline" || !raw.k) return null;
    const { k } = raw;
    const open = Number.parseFloat(k.o);
    const high = Number.parseFloat(k.h);
    const low = Number.parseFloat(k.l);
    const close = Number.parseFloat(k.c);
    const volume = Number.parseFloat(k.v);
    if (
        [open, high, low, close, volume].some((n) => !Number.isFinite(n))
    ) {
        return null;
    }
    return {
        timestamp: k.t,
        time: "",
        open,
        high,
        low,
        close,
        volume,
    };
}

export type NormalizedMarkPrice = {
    symbol: string;
    markPrice: number;
    indexPrice: number;
    fundingRate: number;
    nextFundingTime: number;
    eventTime: number;
};

export function normalizeMarkPriceStreamEvent(
    raw: MarkPriceStreamEvent,
): NormalizedMarkPrice | null {
    if (!raw || raw.e !== "markPriceUpdate") return null;
    const markPrice = Number.parseFloat(raw.p);
    const indexPrice = Number.parseFloat(raw.i);
    const fundingRate = Number.parseFloat(raw.r);
    if (
        !Number.isFinite(markPrice) ||
        !Number.isFinite(indexPrice) ||
        !Number.isFinite(fundingRate) ||
        !Number.isFinite(raw.T)
    ) {
        return null;
    }
    return {
        symbol: raw.s,
        markPrice,
        indexPrice,
        fundingRate,
        nextFundingTime: raw.T,
        eventTime: raw.E ?? Date.now(),
    };
}

export type OrderBookSideUpdate = [string, string][];
export type OrderBookSnapshot = {
    lastUpdateId: number;
    bids: string[][];
    asks: string[][];
};
export type OrderBookDiff = {
    U: number;
    u: number;
    pu?: number;
    b?: OrderBookSideUpdate;
    a?: OrderBookSideUpdate;
};

export type OrderBookState = {
    lastUpdateId: number;
    bids: Map<string, number>;
    asks: Map<string, number>;
};

export function createOrderBookState(snapshot: OrderBookSnapshot): OrderBookState {
    const bids = new Map<string, number>();
    const asks = new Map<string, number>();

    for (const [price, qty] of snapshot.bids) {
        const parsed = Number.parseFloat(qty);
        if (Number.isFinite(parsed) && parsed > 0) bids.set(price, parsed);
    }
    for (const [price, qty] of snapshot.asks) {
        const parsed = Number.parseFloat(qty);
        if (Number.isFinite(parsed) && parsed > 0) asks.set(price, parsed);
    }

    return {
        lastUpdateId: snapshot.lastUpdateId,
        bids,
        asks,
    };
}

export function applyOrderBookDiff(
    state: OrderBookState,
    diff: OrderBookDiff,
): OrderBookState | null {
    const lastUpdateId = state.lastUpdateId;
    const nextCheck = diff.pu ?? diff.U;
    if (nextCheck > lastUpdateId + 1) {
        return null;
    }
    if (diff.u <= lastUpdateId) {
        return state;
    }
    if (diff.U > lastUpdateId + 1 && diff.pu == null) {
        return null;
    }

    const bids = new Map(state.bids);
    const asks = new Map(state.asks);

    const applySide = (updates: OrderBookSideUpdate | undefined, side: Map<string, number>) => {
        if (!updates) return;
        for (const [price, qty] of updates) {
            const parsed = Number.parseFloat(qty);
            if (!Number.isFinite(parsed) || parsed <= 0) {
                side.delete(price);
            } else {
                side.set(price, parsed);
            }
        }
    };

    applySide(diff.b, bids);
    applySide(diff.a, asks);

    return {
        lastUpdateId: diff.u,
        bids,
        asks,
    };
}

function mapSide(
    side: Map<string, number>,
    descending: boolean,
): { price: number; quantity: number }[] {
    return [...side.entries()]
        .map(([price, quantity]) => ({
            price: Number.parseFloat(price),
            quantity,
        }))
        .filter((x) => Number.isFinite(x.price) && Number.isFinite(x.quantity))
        .sort((a, b) => (descending ? b.price - a.price : a.price - b.price));
}

export type DerivedOrderBookEntry = {
    price: number;
    quantity: number;
    total: number;
    depth: number;
};

export type DerivedOrderBookData = {
    bids: DerivedOrderBookEntry[];
    asks: DerivedOrderBookEntry[];
    spread: number;
    spreadPercent: number;
    midPrice: number;
};

export function deriveOrderBookData(
    state: OrderBookState | null,
    grouping: number,
): DerivedOrderBookData | null {
    if (!state) return null;

    const groupEntries = (
        raw: { price: number; quantity: number }[],
        side: "bid" | "ask",
        limitBuckets = 1000,
    ): { price: number; quantity: number }[] => {
        const decimals =
            grouping < 1 ? (grouping.toString().split(".")[1]?.length ?? 0) : 0;

        const roundToDecimals = (value: number, d: number) => {
            const factor = 10 ** d;
            return Math.round(value * factor) / factor;
        };

        const map = new Map<number, number>();
        for (const { price, quantity } of raw) {
            const keyRaw =
                side === "bid"
                    ? Math.floor(price / grouping) * grouping
                    : Math.ceil(price / grouping) * grouping;
            const key = roundToDecimals(keyRaw, decimals);
            map.set(key, (map.get(key) ?? 0) + quantity);
        }

        return [...map.entries()]
            .map(([price, quantity]) => ({ price, quantity }))
            .sort((a, b) =>
                side === "bid" ? b.price - a.price : a.price - b.price,
            )
            .slice(0, limitBuckets);
    };

    const rawBids = groupEntries(mapSide(state.bids, true), "bid");
    const rawAsks = groupEntries(mapSide(state.asks, false), "ask");

    let bidRunning = 0;
    const bidsWithTotal = rawBids.map((b) => {
        bidRunning += b.quantity;
        return { ...b, total: bidRunning };
    });

    let askRunning = 0;
    const asksWithTotal = rawAsks.map((a) => {
        askRunning += a.quantity;
        return { ...a, total: askRunning };
    });

    const maxTotal = Math.max(bidRunning, askRunning);
    const bids: DerivedOrderBookEntry[] = bidsWithTotal.map((b) => ({
        ...b,
        depth: maxTotal > 0 ? b.total / maxTotal : 0,
    }));
    const asks: DerivedOrderBookEntry[] = asksWithTotal.map((a) => ({
        ...a,
        depth: maxTotal > 0 ? a.total / maxTotal : 0,
    }));

    const bestBid = bids[0]?.price ?? 0;
    const bestAsk = asks[0]?.price ?? 0;
    const spread = bestAsk - bestBid;
    const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;
    const midPrice = (bestBid + bestAsk) / 2;

    return {
        bids,
        asks,
        spread,
        spreadPercent,
        midPrice,
    };
}
