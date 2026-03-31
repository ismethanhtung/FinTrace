const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';
const FAPI_BASE_URL = 'https://fapi.binance.com/fapi/v1';

/** Which market this asset/data belongs to */
export type MarketType = 'spot' | 'futures';

export type BinanceTicker = {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
  weightedAvgPrice: string;
};

/** Raw 24hr ticker from Binance Futures (USD-M Perpetual) */
export type FuturesTicker = {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
  openInterest?: string;
};

/**
 * Mark price + funding rate data for a futures symbol.
 * Sourced from fapi/v1/premiumIndex.
 */
export type FuturesPremiumIndex = {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  estimatedSettlePrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  interestRate: string;
  time: number;
};

/** Raw recent trade format from Binance Spot/Futures */
export type BinanceRecentTrade = {
  id: number;
  price: string;
  qty: string;
  quoteQty?: string;
  time: number;
  isBuyerMaker: boolean;
};

export type Asset = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  volume24h: string;
  high24h: number;
  low24h: number;
  /** Raw base-asset volume (e.g. BTC amount) */
  baseVolume: number;
  /** Raw quote-asset (USDT) volume */
  quoteVolumeRaw: number;
  sparkline: number[];
  /** Logo URL resolved from Binance marketing metadata, optional */
  logoUrl?: string;
  /** Which market this asset belongs to */
  marketType?: MarketType;
  /** Futures-specific: mark price from premiumIndex */
  markPrice?: number;
  /** Futures-specific: index price from premiumIndex */
  indexPrice?: number;
  /** Futures-specific: current funding rate (decimal, e.g. 0.0001 = 0.01%) */
  fundingRate?: number;
  /** Futures-specific: next funding settlement timestamp (ms) */
  nextFundingTime?: number;
  /** Stock-only company profile sourced from listing_companies */
  stockProfile?: {
    exchange?: string;
    organName?: string;
    organShortName?: string;
    organTypeCode?: string;
    comTypeCode?: string;
    sector?: string;
    industry?: string;
    group?: string;
    subgroup?: string;
    icbName?: string;
    icbNamePath?: string;
    icbCode?: number;
    indexMembership?: string[];
  };
};

export type OhlcvPoint = {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

// Map from user-facing label → Binance interval string
export const INTERVAL_MAP: Record<string, string> = {
  '1m':  '1m',
  '5m':  '5m',
  '15m': '15m',
  '30m': '30m',
  '1H':  '1h',
  '4H':  '4h',
  '1D':  '1d',
  '1W':  '1w',
  '1M':  '1M',
};

// Map interval → sensible kline limit
export const INTERVAL_LIMIT: Record<string, number> = {
  '1m':  120,
  '5m':  120,
  '15m': 96,
  '30m': 96,
  '1H':  72,
  '4H':  60,
  '1D':  60,
  '1W':  52,
  '1M':  36,
};

export const binanceService = {
  // ─── Spot API ────────────────────────────────────────────────────────────────

  /** Get 24hr ticker data for all spot symbols */
  async getTickers(): Promise<BinanceTicker[]> {
    const response = await fetch(`${BINANCE_BASE_URL}/ticker/24hr`);
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
    return response.json() as Promise<BinanceTicker[]>;
  },

  /**
   * Get OHLCV candlestick data for a spot symbol.
   * Pass `endTime` (ms) to fetch candles ending before that timestamp (for history panning).
   */
  async getKlines(
    symbol: string,
    interval: string = '1H',
    limit?: number,
    endTime?: number,
  ): Promise<any[]> {
    const binanceInterval = INTERVAL_MAP[interval] ?? interval;
    const resolvedLimit = limit ?? INTERVAL_LIMIT[interval] ?? 72;
    let url = `${BINANCE_BASE_URL}/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${resolvedLimit}`;
    if (endTime) url += `&endTime=${endTime}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Binance klines error: ${response.status}`);
    return response.json();
  },

  /** Get spot order book depth. limit max = 1000 on Binance */
  async getDepth(symbol: string, limit: number = 1000): Promise<{ lastUpdateId: number; bids: string[][]; asks: string[][] }> {
    const response = await fetch(`${BINANCE_BASE_URL}/depth?symbol=${symbol}&limit=${limit}`);
    if (!response.ok) throw new Error(`Binance depth error: ${response.status}`);
    return response.json();
  },

  /** Get latest public spot trades for a symbol (max 1000). */
  async getRecentTrades(symbol: string, limit: number = 80): Promise<BinanceRecentTrade[]> {
    const response = await fetch(`${BINANCE_BASE_URL}/trades?symbol=${symbol}&limit=${limit}`);
    if (!response.ok) throw new Error(`Binance trades error: ${response.status}`);
    return response.json() as Promise<BinanceRecentTrade[]>;
  },

  // ─── Futures (USD-M Perpetual) API ───────────────────────────────────────────

  /** Get 24hr ticker data for all USD-M futures perpetual symbols */
  async getFuturesTickers(): Promise<FuturesTicker[]> {
    const response = await fetch(`${FAPI_BASE_URL}/ticker/24hr`);
    if (!response.ok) throw new Error(`Binance Futures API error: ${response.status}`);
    return response.json() as Promise<FuturesTicker[]>;
  },

  /**
   * Get mark price, index price and funding rate for a futures symbol.
   * Updates approximately every 3 seconds on Binance's end.
   */
  async getFuturesPremiumIndex(symbol: string): Promise<FuturesPremiumIndex> {
    const response = await fetch(`${FAPI_BASE_URL}/premiumIndex?symbol=${symbol}`);
    if (!response.ok) throw new Error(`Futures premiumIndex error: ${response.status}`);
    return response.json() as Promise<FuturesPremiumIndex>;
  },

  /**
   * Get OHLCV candlestick data for a futures symbol.
   * Pass `endTime` (ms) to fetch candles ending before that timestamp.
   */
  async getFuturesKlines(
    symbol: string,
    interval: string = '1H',
    limit?: number,
    endTime?: number,
  ): Promise<any[]> {
    const binanceInterval = INTERVAL_MAP[interval] ?? interval;
    const resolvedLimit = limit ?? INTERVAL_LIMIT[interval] ?? 72;
    let url = `${FAPI_BASE_URL}/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${resolvedLimit}`;
    if (endTime) url += `&endTime=${endTime}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Futures klines error: ${response.status}`);
    return response.json();
  },

  /** Get futures order book depth. limit max = 1000 on Binance Futures */
  async getFuturesDepth(symbol: string, limit: number = 1000): Promise<{ lastUpdateId: number; bids: string[][]; asks: string[][] }> {
    const response = await fetch(`${FAPI_BASE_URL}/depth?symbol=${symbol}&limit=${limit}`);
    if (!response.ok) throw new Error(`Futures depth error: ${response.status}`);
    return response.json();
  },

  /** Get latest public futures trades for a symbol (max 1000). */
  async getFuturesRecentTrades(symbol: string, limit: number = 80): Promise<BinanceRecentTrade[]> {
    const response = await fetch(`${FAPI_BASE_URL}/trades?symbol=${symbol}&limit=${limit}`);
    if (!response.ok) throw new Error(`Futures trades error: ${response.status}`);
    return response.json() as Promise<BinanceRecentTrade[]>;
  },

  // ─── Shared transforms ───────────────────────────────────────────────────────

  /** Transform Binance kline array into typed OhlcvPoint */
  mapKline(k: any[]): OhlcvPoint {
    return {
      timestamp: k[0],
      time: '', // formatted by consumer
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    };
  },

  /** Transform raw Binance spot ticker → internal Asset type */
  transformTicker(ticker: BinanceTicker): Asset {
    const symbol = ticker.symbol.replace('USDT', '');
    const quoteVolumeRaw = parseFloat(ticker.quoteVolume);
    const baseVolume = parseFloat(ticker.volume);
    return {
      id: ticker.symbol,
      symbol,
      name: symbol,
      price: parseFloat(ticker.lastPrice),
      change: parseFloat(ticker.priceChange),
      changePercent: parseFloat(ticker.priceChangePercent),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      baseVolume,
      quoteVolumeRaw,
      marketCap: '-',
      volume24h: `$${(quoteVolumeRaw / 1_000_000).toFixed(1)}M`,
      sparkline: [],
      marketType: 'spot',
    };
  },

  /** Transform raw Binance Futures ticker → internal Asset type */
  transformFuturesTicker(ticker: FuturesTicker): Asset {
    const symbol = ticker.symbol.replace('USDT', '').replace('_PERP', '');
    const quoteVolumeRaw = parseFloat(ticker.quoteVolume);
    const baseVolume = parseFloat(ticker.volume);
    return {
      id: ticker.symbol,
      symbol,
      name: symbol,
      price: parseFloat(ticker.lastPrice),
      change: parseFloat(ticker.priceChange),
      changePercent: parseFloat(ticker.priceChangePercent),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      baseVolume,
      quoteVolumeRaw,
      marketCap: '-',
      volume24h: `$${(quoteVolumeRaw / 1_000_000).toFixed(1)}M`,
      sparkline: [],
      marketType: 'futures',
    };
  },
};
