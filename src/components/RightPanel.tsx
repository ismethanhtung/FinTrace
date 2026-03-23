"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, BrainCircuit, Info, MessageSquare, Zap, GripVertical } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useMarket } from '../context/MarketContext';

const MIN_WIDTH = 220;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 320;

export const RightPanel = () => {
  const { selectedSymbol, assets } = useMarket();
  const currentAsset = assets.find(a => a.id === selectedSymbol);
  const baseSymbol = selectedSymbol.replace('USDT', '');

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, [width]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      // Dragging left edge: drag left = wider (negative delta = more width)
      const delta = startX.current - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(next);
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <div
      className="h-full flex flex-col bg-main border-l border-main relative shrink-0"
      style={{ width }}
    >
      {/* ── Left-edge resize handle ── */}
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 w-1.5 h-full z-20 cursor-col-resize group flex items-center justify-center"
        title="Drag to resize"
      >
        <div className="w-0.5 h-10 rounded-full bg-main border border-main group-hover:bg-accent/40 transition-colors" />
      </div>

      {/* ── Header ── */}
      <div className="pl-5 pr-4 py-3 border-b border-main flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Sparkles size={13} className="text-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">AI Analysis</span>
        </div>
        <div className="flex items-center space-x-1">
          <GripVertical size={12} className="text-muted/40" />
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto thin-scrollbar pl-5 pr-4 py-4 space-y-5">
        {/* Market Sentiment */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-muted">
            <BrainCircuit size={13} />
            <span className="text-[10px] font-semibold uppercase tracking-tight">
              Market Sentiment · {baseSymbol}
            </span>
          </div>
          <div className="p-3 bg-secondary rounded-lg border border-main">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium">Bullish</span>
              <span className="text-[12px] font-mono text-emerald-500">78%</span>
            </div>
            <div className="w-full h-1 bg-main border border-main rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '78%' }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-emerald-500"
              />
            </div>
            <p className="text-[11px] text-muted mt-3 leading-relaxed">
              Based on technical indicators and social volume, {baseSymbol} shows strong accumulation
              patterns at the current level.
            </p>
          </div>
        </div>

        {/* Key Signals */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-muted">
            <Zap size={13} />
            <span className="text-[10px] font-semibold uppercase tracking-tight">Key Signals</span>
          </div>
          <div className="space-y-1">
            {[
              { label: 'RSI (14)', value: '58.4', status: 'Neutral' },
              { label: 'MACD', value: 'Bullish Crossover', status: 'Positive' },
              { label: 'Moving Avg', value: 'Above 200D', status: 'Positive' },
            ].map((signal, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 hover:bg-secondary rounded transition-colors border border-transparent hover:border-main"
              >
                <span className="text-[11px] text-muted">{signal.label}</span>
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    signal.status === 'Positive' ? 'text-emerald-500' : 'text-main',
                  )}
                >
                  {signal.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 24h Asset Summary (uses real data) */}
        {currentAsset && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-muted">
              <Info size={13} />
              <span className="text-[10px] font-semibold uppercase tracking-tight">
                {baseSymbol} 24h Summary
              </span>
            </div>
            <div className="rounded-lg border border-main overflow-hidden">
              {[
                {
                  label: '24h Change',
                  value: `${currentAsset.changePercent >= 0 ? '+' : ''}${currentAsset.changePercent.toFixed(2)}%`,
                  sub: `${currentAsset.change >= 0 ? '+' : ''}$${Math.abs(currentAsset.change).toFixed(2)}`,
                  color: currentAsset.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500',
                },
                {
                  label: '24h High',
                  value: `$${currentAsset.high24h?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                  color: 'text-emerald-500',
                },
                {
                  label: '24h Low',
                  value: `$${currentAsset.low24h?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                  color: 'text-rose-500',
                },
                {
                  label: `Vol (${baseSymbol})`,
                  value: currentAsset.baseVolume
                    ? currentAsset.baseVolume >= 1000
                      ? `${(currentAsset.baseVolume / 1000).toFixed(2)}K`
                      : currentAsset.baseVolume.toFixed(2)
                    : '-',
                },
                {
                  label: 'Vol (USDT)',
                  value: currentAsset.quoteVolumeRaw
                    ? currentAsset.quoteVolumeRaw >= 1_000_000_000
                      ? `$${(currentAsset.quoteVolumeRaw / 1_000_000_000).toFixed(2)}B`
                      : `$${(currentAsset.quoteVolumeRaw / 1_000_000).toFixed(1)}M`
                    : '-',
                },
              ].map((row, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between px-3 py-2',
                    i % 2 === 0 ? 'bg-secondary/30' : '',
                  )}
                >
                  <span className="text-[10px] text-muted">{row.label}</span>
                  <div className="text-right">
                    <span className={cn('text-[11px] font-mono font-semibold', row.color ?? '')}>
                      {row.value}
                    </span>
                    {row.sub && (
                      <div className={cn('text-[9px]', row.color ?? 'text-muted')}>{row.sub}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent News */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-muted">
            <Info size={13} />
            <span className="text-[10px] font-semibold uppercase tracking-tight">Recent News</span>
          </div>
          <div className="space-y-3">
            {[
              { title: 'SEC Approves New Crypto ETF Framework', time: '2h ago', source: 'Reuters' },
              { title: 'Whale Movement: 5,000 BTC to Cold Storage', time: '4h ago', source: 'WhaleAlert' },
              { title: 'Global Markets Rally on Inflation Data', time: '6h ago', source: 'Bloomberg' },
            ].map((news, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="text-[11px] font-medium leading-snug group-hover:text-accent transition-colors">
                  {news.title}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-[9px] text-muted">{news.source}</span>
                  <span className="text-[9px] text-muted/30">•</span>
                  <span className="text-[9px] text-muted">{news.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chat Input ── */}
      <div className="pl-5 pr-4 py-3 border-t border-main shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder={`Ask AI about ${baseSymbol}...`}
            className="w-full bg-secondary border border-main rounded-full py-2 pl-4 pr-10 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent/30"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-accent text-white rounded-full hover:bg-accent/90 transition-colors">
            <MessageSquare size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};
