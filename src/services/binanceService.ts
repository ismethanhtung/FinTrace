const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

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
  sparkline: number[];
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
  /** Get 24hr ticker data for all symbols */
  async getTickers(): Promise<BinanceTicker[]> {
    const response = await fetch(`${BINANCE_BASE_URL}/ticker/24hr`);
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
    return response.json() as Promise<BinanceTicker[]>;
  },

  /** Get OHLCV candlestick data for a symbol */
  async getKlines(symbol: string, interval: string = '1H', limit?: number): Promise<any[]> {
    const binanceInterval = INTERVAL_MAP[interval] ?? interval;
    const resolvedLimit = limit ?? INTERVAL_LIMIT[interval] ?? 72;
    const url = `${BINANCE_BASE_URL}/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${resolvedLimit}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Binance klines error: ${response.status}`);
    return response.json();
  },

  /** Get order book depth */
  async getDepth(symbol: string, limit: number = 20): Promise<{ bids: string[][], asks: string[][] }> {
    const response = await fetch(`${BINANCE_BASE_URL}/depth?symbol=${symbol}&limit=${limit}`);
    if (!response.ok) throw new Error(`Binance depth error: ${response.status}`);
    return response.json();
  },

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

  /** Transform raw Binance ticker → internal Asset type */
  transformTicker(ticker: BinanceTicker): Asset {
    const symbol = ticker.symbol.replace('USDT', '');
    return {
      id: ticker.symbol,
      symbol,
      name: symbol,
      price: parseFloat(ticker.lastPrice),
      change: parseFloat(ticker.priceChange),
      changePercent: parseFloat(ticker.priceChangePercent),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      marketCap: '-',
      volume24h: `$${(parseFloat(ticker.quoteVolume) / 1_000_000).toFixed(1)}M`,
      sparkline: [],
    };
  },
};
