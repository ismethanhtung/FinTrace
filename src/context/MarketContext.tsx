"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { binanceService, Asset, BinanceTicker } from '../services/binanceService';

interface MarketContextType {
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  assets: Asset[];
  isLoading: boolean;
  error: string | null;
}

const MarketContext = React.createContext<MarketContextType | undefined>(undefined);

export const MarketProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      const tickers: BinanceTicker[] = await binanceService.getTickers();
      const topUSDT = tickers
        .filter(t => t.symbol.endsWith('USDT'))
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, 50);
      setAssets(topUSDT.map(binanceService.transformTicker));
      setError(null);
    } catch (err) {
      console.error('[MarketProvider] Failed to fetch assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
    const interval = setInterval(fetchAssets, 30_000);
    return () => clearInterval(interval);
  }, [fetchAssets]);

  return (
    <MarketContext.Provider value={{ selectedSymbol, setSelectedSymbol, assets, isLoading, error }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const ctx = React.useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within a MarketProvider');
  return ctx;
};
