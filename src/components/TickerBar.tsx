"use client";

import React from 'react';
import { cn } from '../lib/utils';
import { useMarket } from '../context/MarketContext';
import { TokenAvatar } from './TokenAvatar';
import { Wifi } from 'lucide-react';

const priceFmt = (v: number) =>
  v < 0.001
    ? v.toFixed(6)
    : v < 0.01
    ? v.toFixed(5)
    : v < 1
    ? v.toFixed(4)
    : v < 10000
    ? v.toFixed(2)
    : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const TickerBar = () => {
  const { assets, setSelectedSymbol } = useMarket();

  if (assets.length === 0) return null;

  // Duplicate for seamless infinite loop
  const items = [...assets, ...assets];

  return (
    <div className="h-7 border-t border-main bg-secondary/40 flex items-center overflow-hidden shrink-0">
      {/* Connection status */}
      <div className="flex items-center space-x-1.5 px-3 border-r border-main h-full shrink-0">
        <Wifi size={11} className="text-emerald-500" />
        <span className="text-[10px] font-semibold text-emerald-500 whitespace-nowrap">Kết nối ổn định</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
      </div>

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden ticker-wrapper cursor-default select-none">
        <div className="ticker-track items-center gap-0">
          {items.map((asset, i) => (
            <button
              key={`${asset.id}-${i}`}
              onClick={() => setSelectedSymbol(asset.id)}
              className="flex items-center space-x-1.5 px-4 h-8 hover:bg-secondary/80 transition-colors border-r border-main last:border-r-0 shrink-0"
            >
              <TokenAvatar
                symbol={asset.symbol}
                logoUrl={asset.logoUrl}
                size={14}
              />
              <span className="text-[10px] font-semibold whitespace-nowrap">
                {asset.symbol}
                <span className="text-muted font-normal">/USDT</span>
              </span>
              <span
                className={cn(
                  'text-[9px] font-bold',
                  asset.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500',
                )}
              >
                {asset.changePercent >= 0 ? '+' : ''}
                {asset.changePercent.toFixed(2)}%
              </span>
              <span className="text-[10px] font-mono text-muted whitespace-nowrap">
                {priceFmt(asset.price)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Attribution */}
      <div className="flex items-center px-3 border-l border-main h-full shrink-0">
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-muted/60 hover:text-muted transition-colors whitespace-nowrap"
        >
          Charts by TradingView
        </a>
      </div>
    </div>
  );
};
