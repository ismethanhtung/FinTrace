"use client";

import React from 'react';
import { Newspaper, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useCoinNews } from '../../hooks/useCoinNews';
import { cn } from '../../lib/utils';

export const NewsPanel = () => {
  const { selectedSymbol } = useMarket();
  const { cryptoPanicApiKey } = useAppSettings();

  const { news, isLoading, error, refetch, baseSymbol } = useCoinNews({
    symbol: selectedSymbol,
    authToken: cryptoPanicApiKey,
  });

  return (
    <div className="flex-1 overflow-y-auto thin-scrollbar p-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2 text-muted">
          <Newspaper size={14} />
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
          <span>Failed to load news.</span>
          <span className="text-[10px] opacity-80">{error}</span>
          <button onClick={refetch} className="px-3 py-1 bg-rose-500/20 rounded hover:bg-rose-500/30 transition-colors">
            Retry
          </button>
        </div>
      ) : isLoading && news.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 space-y-3 opacity-60">
          <RefreshCw size={18} className="animate-spin text-muted" />
          <span className="text-[11px] text-muted">Fetching {baseSymbol} news...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {news.length === 0 ? (
            <div className="text-center text-muted text-[12px] py-10">
              No recent news found for {baseSymbol}.
            </div>
          ) : (
            news.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group block p-4 bg-secondary/50 hover:bg-secondary rounded-xl border border-transparent hover:border-main transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-[13px] font-semibold leading-snug group-hover:text-accent transition-colors line-clamp-3">
                    {item.title}
                  </h4>
                  <ExternalLink size={12} className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 bg-main border border-main rounded text-[9px] font-medium text-muted">
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
                
                {item.currencies && item.currencies.length > 0 && (
                  <div className="flex items-center gap-1 mt-3 flex-wrap">
                    {item.currencies.slice(0, 4).map(c => (
                      <span key={c} className="text-[9px] font-mono text-muted/70 uppercase">#{c}</span>
                    ))}
                  </div>
                )}
              </a>
            ))
          )}
          
          {!cryptoPanicApiKey && (
            <div className="px-4 py-3 bg-accent/5 border border-accent/20 rounded-xl flex items-start space-x-3 mt-6">
              <Info size={14} className="text-accent shrink-0 mt-0.5" />
              <div className="text-[11px] text-muted leading-relaxed">
                You are viewing mock sample news. To see real, live updates for <span className="font-semibold text-main">{baseSymbol}</span>, please configure your free CryptoPanic API key in <span className="font-semibold text-main">Settings</span>.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
