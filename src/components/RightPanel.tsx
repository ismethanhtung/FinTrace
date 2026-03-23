import React from 'react';
import { Sparkles, BrainCircuit, Info, MessageSquare, Zap, Share2, Maximize2 } from 'lucide-react';
import { motion } from 'motion/react';

import { useMarket } from '../context/MarketContext';

export const RightPanel = () => {
  const { selectedSymbol, assets } = useMarket();
  const currentAsset = assets.find(a => a.id === selectedSymbol);
  const baseSymbol = selectedSymbol.replace('USDT', '');

  return (
    <div className="w-80 h-full flex flex-col bg-main border-l border-main">
      <div className="px-4 py-3 border-b border-main flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles size={14} className="text-accent" />
          <span className="text-[12px] font-semibold uppercase tracking-wider">AI Analysis</span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1 hover:bg-secondary rounded transition-colors">
            <Maximize2 size={12} className="text-muted" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar p-4 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-muted">
            <BrainCircuit size={14} />
            <span className="text-[11px] font-medium uppercase tracking-tight">Market Sentiment: {baseSymbol}</span>
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
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-emerald-500"
              />
            </div>
            <p className="text-[11px] text-muted mt-3 leading-relaxed">
              Based on technical indicators and social volume, {baseSymbol} shows strong accumulation patterns at the current level.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-muted">
            <Zap size={14} />
            <span className="text-[11px] font-medium uppercase tracking-tight">Key Signals</span>
          </div>
          <div className="space-y-2">
            {[
              { label: 'RSI (14)', value: '58.4', status: 'Neutral' },
              { label: 'MACD', value: 'Bullish Crossover', status: 'Positive' },
              { label: 'Moving Avg', value: 'Above 200D', status: 'Positive' },
            ].map((signal, i) => (
              <div key={i} className="flex items-center justify-between p-2 hover:bg-secondary rounded transition-colors border border-transparent hover:border-main">
                <span className="text-[11px] text-muted">{signal.label}</span>
                <span className={cn(
                  "text-[11px] font-medium",
                  signal.status === 'Positive' ? "text-emerald-500" : "text-main"
                )}>{signal.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-muted">
            <Info size={14} />
            <span className="text-[11px] font-medium uppercase tracking-tight">Recent News</span>
          </div>
          <div className="space-y-4">
            {[
              { title: 'SEC Approves New Crypto ETF Framework', time: '2h ago', source: 'Reuters' },
              { title: 'Whale Movement: 5,000 BTC Transferred to Cold Storage', time: '4h ago', source: 'WhaleAlert' },
              { title: 'Global Markets Rally on Inflation Data', time: '6h ago', source: 'Bloomberg' },
            ].map((news, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="text-[12px] font-medium leading-snug group-hover:text-accent transition-colors">{news.title}</div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-[10px] text-muted">{news.source}</span>
                  <span className="text-[10px] text-muted/30">•</span>
                  <span className="text-[10px] text-muted">{news.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-main">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Ask AI about this asset..." 
            className="w-full bg-secondary border border-main rounded-full py-2 pl-4 pr-10 text-[12px] focus:outline-none focus:ring-1 focus:ring-accent/30"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-accent text-white rounded-full hover:bg-accent/90 transition-colors">
            <MessageSquare size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

import { cn } from '../lib/utils';
