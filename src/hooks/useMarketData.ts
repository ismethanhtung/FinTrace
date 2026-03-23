import { useState, useEffect, useCallback, useRef } from 'react';
import { binanceService, Asset, BinanceTicker } from '../services/binanceService';

export const useMarketData = (selectedSymbol: string = 'BTCUSDT') => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [chartData, setChartData] = useState<{ time: string, value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      const tickers: BinanceTicker[] = await binanceService.getTickers();
      
      // Filter for USDT pairs and sort by quote volume (liquidity/popularity)
      const topUSDT = tickers
        .filter(t => t.symbol.endsWith('USDT'))
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, 50); // Get top 50

      const mapped = topUSDT.map(binanceService.transformTicker);
      setAssets(mapped);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchChartData = useCallback(async (symbol: string) => {
    try {
      const klines = await binanceService.getKlines(symbol);
      const mapped = klines.map(k => ({
        time: new Date(k[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: parseFloat(k[4]) // Closing price
      }));
      setChartData(mapped);
    } catch (err: any) {
      console.error('Chart Data fail:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll for whole asset list (less frequent)
  useEffect(() => {
    fetchAssets();
    const interval = setInterval(fetchAssets, 30000); // 30s
    return () => clearInterval(interval);
  }, [fetchAssets]);

  // Poll for chart data (more frequent for current coin)
  useEffect(() => {
    fetchChartData(selectedSymbol);
    const interval = setInterval(() => fetchChartData(selectedSymbol), 5000); // 5s
    return () => clearInterval(interval);
  }, [selectedSymbol, fetchChartData]);

  return { assets, chartData, isLoading, error, refresh: fetchAssets };
};
