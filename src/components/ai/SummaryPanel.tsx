"use client";

import React from 'react';
import { Target, Activity, Zap, TrendingUp, TrendingDown, AlignLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMarket } from '../../context/MarketContext';

export const SummaryPanel = () => {
  const { selectedSymbol, assets } = useMarket();
  const currentAsset = assets.find(a => a.id === selectedSymbol);
  const baseSymbol = selectedSymbol.replace('USDT', '');

  const isBullish = currentAsset ? currentAsset.changePercent >= 0 : true;

  if (!currentAsset) return null;

  return (
    <div className="flex-1 overflow-y-auto thin-scrollbar bg-main">
      
      {/* ── Metric Header ── */}
      <div className="px-4 py-3 bg-secondary/30 border-b border-main flex justify-between items-end">
        <div>
          <div className="text-[10px] text-muted font-semibold uppercase tracking-wider mb-0.5">Base Asset</div>
          <div className="text-[16px] font-bold text-main">{baseSymbol}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted font-semibold uppercase tracking-wider mb-0.5">24h Change</div>
          <div className={cn("text-[14px] font-mono font-bold flex items-center gap-1", isBullish ? "text-emerald-500" : "text-rose-500")}>
            {isBullish ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isBullish ? '+' : ''}{currentAsset.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* ── Actionable Sentiment ── */}
      <div className="p-4 border-b border-main">
        <div className="flex items-center space-x-1.5 mb-2.5">
          <Target size={12} className="text-accent" />
          <span className="text-[11px] font-bold text-main uppercase">Intraday Momentum Bias</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-[10px] mb-1.5 font-mono">
              <span className="text-rose-500">BEAR</span>
              <span className="text-emerald-500">BULL</span>
            </div>
            <div className="h-1.5 w-full bg-main rounded-full overflow-hidden flex">
              {currentAsset?.low24h && currentAsset?.high24h && currentAsset.high24h > currentAsset.low24h ? (
                (() => {
                  const range = currentAsset.high24h - currentAsset.low24h;
                  const pos = currentAsset.price - currentAsset.low24h;
                  const bullPct = Math.min(100, Math.max(0, (pos / range) * 100));
                  const bearPct = 100 - bullPct;
                  return (
                    <>
                      <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${bearPct}%` }} />
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${bullPct}%` }} />
                    </>
                  );
                })()
              ) : (
                <div className="h-full bg-accent/50 w-full" />
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            {currentAsset?.low24h && currentAsset?.high24h && currentAsset.high24h > currentAsset.low24h ? (
              (() => {
                const range = currentAsset.high24h - currentAsset.low24h;
                const bullPct = Math.min(100, Math.max(0, ((currentAsset.price - currentAsset.low24h) / range) * 100));
                const isBull = bullPct >= 50;
                return (
                  <>
                    <div className={cn("text-[16px] font-mono font-bold leading-none", isBull ? "text-emerald-500" : "text-rose-500")}>
                      {bullPct.toFixed(0)}%
                    </div>
                    <div className="text-[9px] text-muted uppercase mt-0.5">Strength</div>
                  </>
                );
              })()
            ) : (
              <>
                <div className="text-[16px] font-mono font-bold leading-none text-muted">50%</div>
                <div className="text-[9px] text-muted uppercase mt-0.5">Neutral</div>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-3 p-2.5 bg-secondary/40 border border-main rounded-md text-[11px] text-muted leading-relaxed">
          <strong className="text-main">Calculation Data:</strong> Bias derived mathematically from current price positioning within the 24h trading range (${currentAsset?.low24h?.toLocaleString('en-US', { minimumFractionDigits: 2 })} – ${currentAsset?.high24h?.toLocaleString('en-US', { minimumFractionDigits: 2 })}).
        </div>
      </div>

      {/* ── Key Technicals Tabular ── */}
      <div className="flex flex-col">
        <div className="px-4 py-2 bg-secondary/20 border-b border-main flex items-center space-x-1.5">
          <Activity size={12} className="text-muted" />
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Technical Oscillators (1D)</span>
        </div>
        
        <div className="divide-y divide-main border-b border-main text-[11px]">
          {[
            { ind: 'RSI (14)', val: '58.40', sig: 'Neutral' },
            { ind: 'MACD (12,26)', val: '0.0045', sig: 'Buy' },
            { ind: 'Stochastic', val: '72.10', sig: 'Overbought' },
            { ind: 'VWAP', val: 'Above', sig: 'Buy' },
          ].map((row, i) => (
            <div key={i} className="flex px-4 py-2 hover:bg-secondary/20 transition-colors">
              <div className="w-[100px] text-muted">{row.ind}</div>
              <div className="w-[80px] font-mono text-main">{row.val}</div>
              <div className={cn(
                "flex-1 text-right font-medium",
                row.sig === 'Buy' ? "text-emerald-500" : row.sig === 'Overbought' ? "text-rose-500" : "text-amber-500"
              )}>
                {row.sig}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Vol & Price Action ── */}
      <div className="flex flex-col mb-6">
        <div className="px-4 py-2 bg-secondary/20 border-b border-main flex items-center space-x-1.5">
          <Zap size={12} className="text-muted" />
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">24h Price Action</span>
        </div>
        
        <div className="grid grid-cols-2 divide-x divide-y divide-main border-b border-main">
          <div className="p-3 bg-main">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">24h High</div>
            <div className="text-[12px] font-mono text-emerald-500 font-medium">
              ${currentAsset.high24h?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-main">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">24h Low</div>
            <div className="text-[12px] font-mono text-rose-500 font-medium">
              ${currentAsset.low24h?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-main">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Vol ({baseSymbol})</div>
            <div className="text-[12px] font-mono text-main">
               {currentAsset.baseVolume ? (currentAsset.baseVolume >= 1000 ? `${(currentAsset.baseVolume / 1000).toFixed(2)}K` : currentAsset.baseVolume.toFixed(2)) : '-'}
            </div>
          </div>
          <div className="p-3 bg-main">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Vol (USDT)</div>
            <div className="text-[12px] font-mono text-main">
               {currentAsset.quoteVolumeRaw ? (currentAsset.quoteVolumeRaw >= 1_000_000_000 ? `$${(currentAsset.quoteVolumeRaw / 1_000_000_000).toFixed(2)}B` : `$${(currentAsset.quoteVolumeRaw / 1_000_000).toFixed(1)}M`) : '-'}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
