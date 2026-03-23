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
  sparkline: number[];
};

export const binanceService = {
  // Get 24hr ticker data for all symbols
  async getTickers(): Promise<BinanceTicker[]> {
    const response = await fetch(`${BINANCE_BASE_URL}/ticker/24hr`);
    if (!response.ok) throw new Error('Failed to fetch tickers');
    return response.json();
  },

  // Get historical data (klines) for a symbol
  async getKlines(symbol: string, interval: string = '1h', limit: number = 24): Promise<any[]> {
    const response = await fetch(`${BINANCE_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch klines');
    return response.json();
  },

  // Get order book depth
  async getDepth(symbol: string, limit: number = 20): Promise<{ bids: string[][], asks: string[][] }> {
    const response = await fetch(`${BINANCE_BASE_URL}/depth?symbol=${symbol}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch depth');
    return response.json();
  },

  // Transform Binance Ticker to our Asset format
  // We'll filter for USDT pairs to keep it relevant
  transformTicker(ticker: BinanceTicker): Asset {
    const symbol = ticker.symbol.replace('USDT', '');
    return {
      id: ticker.symbol,
      symbol: symbol,
      name: symbol, // Binance doesn't provide names in ticker, we might need a separate map for names
      price: parseFloat(ticker.lastPrice),
      change: parseFloat(ticker.priceChange),
      changePercent: parseFloat(ticker.priceChangePercent),
      marketCap: '-', // Market cap is not simple with ticker, requires supply data
      volume24h: `$${parseFloat(ticker.quoteVolume).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      sparkline: [], // Placeholder for sparkline data
    };
  }
};
