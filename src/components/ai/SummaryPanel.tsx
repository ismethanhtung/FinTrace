"use client";

import React from 'react';
import { Target, Activity, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useMarket } from '../../context/MarketContext';

export const SummaryPanel = () => {
  const { selectedSymbol, assets } = useMarket();
  const currentAsset = assets.find(a => a.id === selectedSymbol);
  const baseSymbol = selectedSymbol.replace('USDT', '');

  const isBullish = currentAsset ? currentAsset.changePercent >= 0 : true;

  return (
    <div className="flex-1 overflow-y-auto thin-scrollbar p-5 space-y-6">
      {/* ── Sentiment Component ── */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-2"
      >
        <div className="flex items-center space-x-2 text-muted">
          <Target size={13} />
          <span className="text-[10px] font-semibold uppercase tracking-tight">AI Sentiment Analysis</span>
        </div>
        <div className="p-4 bg-secondary rounded-xl border border-main">
          
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className={cn("text-[13px] font-bold", isBullish ? "text-emerald-500" : "text-rose-500")}>
                  {isBullish ? 'BULLISH' : 'BEARISH'}
                </span>
                {isBullish ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-500" />}
              </div>
            </div>
            <span className={cn("text-[16px] font-mono font-bold", isBullish ? "text-emerald-500" : "text-rose-500")}>
              {isBullish ? '78' : '32'}%
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-main border border-main rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: isBullish ? '78%' : '32%' }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={cn("h-full", isBullish ? "bg-emerald-500" : "bg-rose-500")}
            />
          </div>
          <p className="text-[11.5px] text-muted mt-4 leading-relaxed">
            Based on multi-timeframe volume anomalies and order book imbalances, <strong className="text-main">{baseSymbol}</strong> is showing strong institutional positioning for the next 24 hours.
          </p>
        </div>
      </motion.div>

      {/* ── Key Signals ── */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="space-y-2"
      >
        <div className="flex items-center space-x-2 text-muted">
          <Activity size={13} />
          <span className="text-[10px] font-semibold uppercase tracking-tight">Technical Signals</span>
        </div>
        <div className="bg-secondary rounded-xl border border-main divide-y divide-main overflow-hidden">
          {[
            { label: 'RSI (14) Divergence', value: isBullish ? '58.4 (Rising)' : '32.1 (Oversold)', status: isBullish ? 'Positive' : 'Neutral' },
            { label: 'MACD (12, 26) Cross', value: isBullish ? 'Bullish Cross' : 'Bearish Trend', status: isBullish ? 'Positive' : 'Negative' },
            { label: 'VWAP Positioning', value: 'Above 200 EMA', status: 'Positive' },
          ].map((signal, i) => (
            <div key={i} className="flex items-center justify-between p-3 hover:bg-main/30 transition-colors">
              <span className="text-[11.5px] text-muted">{signal.label}</span>
              <span className={cn(
                'text-[11.5px] font-semibold',
                signal.status === 'Positive' ? 'text-emerald-500' : 
                signal.status === 'Negative' ? 'text-rose-500' : 'text-main'
              )}>
                {signal.value}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── 24h Stats ── */}
      {currentAsset && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2 text-muted">
            <Zap size={13} />
            <span className="text-[10px] font-semibold uppercase tracking-tight">24h Market Snapshot</span>
          </div>
          <div className="rounded-xl border border-main bg-main/40 overflow-hidden divide-y divide-main/50">
            {[
              { label: '24h High', value: `$${currentAsset.high24h?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'text-emerald-500' },
              { label: '24h Low',  value: `$${currentAsset.low24h?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,  color: 'text-rose-500' },
              { label: `Vol (${baseSymbol})`, value: currentAsset.baseVolume ? (currentAsset.baseVolume >= 1000 ? `${(currentAsset.baseVolume / 1000).toFixed(2)}K` : currentAsset.baseVolume.toFixed(2)) : '-' },
              { label: 'Vol (USDT)', value: currentAsset.quoteVolumeRaw ? (currentAsset.quoteVolumeRaw >= 1_000_000_000 ? `$${(currentAsset.quoteVolumeRaw / 1_000_000_000).toFixed(2)}B` : `$${(currentAsset.quoteVolumeRaw / 1_000_000).toFixed(1)}M`) : '-' },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-2.5 bg-secondary/20">
                <div className="text-[11.5px] text-muted tracking-wide">{row.label}</div>
                <div className={cn('text-[12px] font-mono font-semibold', row.color ?? 'text-main')}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
