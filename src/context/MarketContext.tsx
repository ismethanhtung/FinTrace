"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useMarketData } from '../hooks/useMarketData';
import { Asset } from '../services/binanceService';

interface MarketContextType {
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  assets: Asset[];
  chartData: { time: string, value: number }[];
  isLoading: boolean;
  error: string | null;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const marketData = useMarketData(selectedSymbol);

  return (
    <MarketContext.Provider value={{ selectedSymbol, setSelectedSymbol, ...marketData }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (context === undefined) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};
