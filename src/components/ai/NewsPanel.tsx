"use client";

import React from 'react';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { useCoinNews } from '../../hooks/useCoinNews';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

export const NewsPanel = () => {
  const { selectedSymbol } = useMarket();

  const { news, isLoading, error, refetch, baseSymbol } = useCoinNews({
    symbol: selectedSymbol,
  });

  return (
    <div className="flex-1 overflow-y-auto thin-scrollbar p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2 text-muted">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-main">
            Latest News · {baseSymbol}
          </span>
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className={cn(
            "p-1.5 rounded-md text-muted hover:text-main hover:bg-secondary transition-colors",
            isLoading && "animate-spin"
          )}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-[12px] flex flex-col items-center justify-center text-center space-y-2">
          <span>Failed to load news via RSS.</span>
          <span className="text-[10px] opacity-80">{error}</span>
          <button onClick={refetch} className="px-3 py-1 bg-rose-500/20 rounded hover:bg-rose-500/30 transition-colors mt-2">
            Retry
          </button>
        </div>
      ) : isLoading && news.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 space-y-3 opacity-60">
          <RefreshCw size={18} className="animate-spin text-muted" />
          <span className="text-[11px] text-muted">Fetching {baseSymbol} news...</span>
        </div>
      ) : (
        <div className="space-y-4 pb-10">
          {news.length === 0 ? (
            <div className="text-center text-muted text-[12px] py-10 border border-main border-dashed rounded-lg bg-secondary/20">
              No recent news found for {baseSymbol}.
            </div>
          ) : (
            news.map((item, idx) => (
              <motion.a
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group block p-4 bg-secondary/40 hover:bg-secondary rounded-lg border border-transparent hover:border-main transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-[12.5px] font-semibold leading-snug group-hover:text-accent transition-colors line-clamp-3 text-main">
                    {item.title}
                  </h4>
                  <ExternalLink size={12} className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 bg-main border border-main rounded text-[9px] font-medium text-muted uppercase">
                      {item.source}
                    </span>
                    <span className="text-[10px] text-muted">{item.relativeTime}</span>
                  </div>
                  
                  {item.sentiment && item.sentiment !== 'neutral' && (
                    <span className={cn(
                      "flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider",
                      item.sentiment === 'positive' ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {item.sentiment}
                    </span>
                  )}
                </div>
              </motion.a>
            ))
          )}
        </div>
      )}
    </div>
  );
};
