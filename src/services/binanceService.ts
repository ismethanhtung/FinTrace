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
  /** Raw base-asset volume (e.g. BTC amount) */
  baseVolume: number;
  /** Raw quote-asset (USDT) volume */
  quoteVolumeRaw: number;
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

  /** Get OHLCV candlestick data for a symbol.
   *  Pass `endTime` (ms) to fetch candles ending before that timestamp (for history panning).
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

  /** Get order book depth. limit max = 1000 on Binance */
  async getDepth(symbol: string, limit: number = 1000): Promise<{ bids: string[][], asks: string[][] }> {
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
    };
  },
};
