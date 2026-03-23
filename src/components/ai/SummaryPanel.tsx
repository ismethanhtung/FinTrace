"use client";

import React from 'react';
import { Sparkles, BrainCircuit, Zap, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useMarket } from '../../context/MarketContext';

export const SummaryPanel = () => {
  const { selectedSymbol, assets } = useMarket();
  const currentAsset = assets.find(a => a.id === selectedSymbol);
  const baseSymbol = selectedSymbol.replace('USDT', '');

  return (
    <div className="flex-1 overflow-y-auto thin-scrollbar px-5 py-4 space-y-5 animate-in fade-in duration-300">
      {/* ── Sentiment (Mocked for now — could be wired to AI later) ── */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-muted">
          <BrainCircuit size={13} />
          <span className="text-[10px] font-semibold uppercase tracking-tight">
            Market Sentiment · {baseSymbol}
          </span>
        </div>
        <div className="p-4 bg-secondary rounded-xl border border-main">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium">Bullish</span>
            <span className="text-[12px] font-mono font-bold text-emerald-500">78%</span>
          </div>
          <div className="w-full h-1.5 bg-main border border-main rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '78%' }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-emerald-500"
            />
          </div>
          <p className="text-[11.5px] text-muted mt-4 leading-relaxed">
            Based on current technical indicators and trailing 24h volume, {baseSymbol} shows strong
            accumulation. Volatility is contracting leading into the next potential breakout.
          </p>
        </div>
      </div>

      {/* ── Key Signals ── */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-muted">
          <Zap size={13} />
          <span className="text-[10px] font-semibold uppercase tracking-tight">Key Signals</span>
        </div>
        <div className="bg-secondary rounded-xl border border-main divide-y divide-main overflow-hidden">
          {[
            { label: 'RSI (14)', value: '58.4', status: 'Neutral' },
            { label: 'MACD (12, 26)', value: 'Bullish Cross', status: 'Positive' },
            { label: 'Trend Check', value: 'Above 200 EMA', status: 'Positive' },
          ].map((signal, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <span className="text-[11.5px] text-muted">{signal.label}</span>
              <span className={cn('text-[11.5px] font-semibold', signal.status === 'Positive' ? 'text-emerald-500' : 'text-main')}>
                {signal.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 24h Stats ── */}
      {currentAsset && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-muted">
            <Info size={13} />
            <span className="text-[10px] font-semibold uppercase tracking-tight">
              24h Summary
            </span>
          </div>
          <div className="rounded-xl border border-main bg-main overflow-hidden">
            {[
              {
                label: '24h Change',
                value: `${currentAsset.changePercent >= 0 ? '+' : ''}${currentAsset.changePercent.toFixed(2)}%`,
                sub: `${currentAsset.change >= 0 ? '+' : ''}$${Math.abs(currentAsset.change).toFixed(2)}`,
                color: currentAsset.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500',
              },
              { label: '24h High', value: `$${currentAsset.high24h?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'text-emerald-500' },
              { label: '24h Low',  value: `$${currentAsset.low24h?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,  color: 'text-rose-500' },
              {
                label: `Vol (${baseSymbol})`,
                value: currentAsset.baseVolume ? (currentAsset.baseVolume >= 1000 ? `${(currentAsset.baseVolume / 1000).toFixed(2)}K` : currentAsset.baseVolume.toFixed(2)) : '-',
              },
              {
                label: 'Vol (USDT)',
                value: currentAsset.quoteVolumeRaw ? (currentAsset.quoteVolumeRaw >= 1_000_000_000 ? `$${(currentAsset.quoteVolumeRaw / 1_000_000_000).toFixed(2)}B` : `$${(currentAsset.quoteVolumeRaw / 1_000_000).toFixed(1)}M`) : '-',
              },
            ].map((row, i) => (
              <div key={i} className={cn('flex items-center justify-between px-4 py-2.5', i % 2 === 0 ? 'bg-secondary/40' : '')}>
                <span className="text-[11px] text-muted">{row.label}</span>
                <div className="text-right">
                  <span className={cn('text-[12px] font-mono font-semibold tracking-tight', row.color ?? '')}>
                    {row.value}
                  </span>
                  {row.sub && (
                    <div className={cn('text-[10px]', row.color ?? 'text-muted')}>{row.sub}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
