"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { useMarket } from '../context/MarketContext';
import { useOrderBook, GROUPING_OPTIONS, Grouping, suggestGrouping } from '../hooks/useOrderBook';
import {
  Download,
  Share2,
  MoreHorizontal,
  Activity,
} from 'lucide-react';

// ─── Formatters ──────────────────────────────────────────────────────────────
const priceFmt = (v: number, grouping: Grouping): string => {
  if (grouping >= 1) return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (grouping >= 0.1) return v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const qtyFmt = (v: number): string => {
  if (v >= 10000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 100) return v.toFixed(2);
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
};

// ─── Single Order Row ─────────────────────────────────────────────────────────
interface OrderRowProps {
  price: number;
  quantity: number;
  total: number;
  depth: number;
  side: 'bid' | 'ask';
  grouping: Grouping;
}

const OrderRow = ({ price, quantity, total, depth, side, grouping }: OrderRowProps) => (
  <div className="relative flex items-center px-3 py-[3px] hover:bg-secondary/60 cursor-pointer group">
    {/* Depth bar background */}
    <div
      className={cn(
        'absolute top-0 bottom-0 pointer-events-none opacity-20',
        side === 'ask' ? 'bg-rose-500 right-0' : 'bg-emerald-500 left-0',
      )}
      style={{ width: `${Math.max(2, depth * 100)}%` }}
    />
    <span className={cn('flex-1 text-[11px] font-mono relative z-10', side === 'ask' ? 'text-rose-500' : 'text-emerald-500')}>
      {priceFmt(price, grouping)}
    </span>
    <span className="flex-1 text-right text-[11px] font-mono relative z-10 text-main">
      {qtyFmt(quantity)}
    </span>
    <span className="flex-1 text-right text-[11px] font-mono relative z-10 text-muted">
      {qtyFmt(total)}
    </span>
  </div>
);

// ─── Column Header ────────────────────────────────────────────────────────────
const ColHeader = ({ baseSymbol }: { baseSymbol: string }) => (
  <div className="flex items-center px-3 py-1 text-muted bg-secondary/20">
    <span className="flex-1 text-[9px] font-bold uppercase tracking-wider">Price (USDT)</span>
    <span className="flex-1 text-right text-[9px] font-bold uppercase tracking-wider">Qty ({baseSymbol})</span>
    <span className="flex-1 text-right text-[9px] font-bold uppercase tracking-wider">Total</span>
  </div>
);

// ─── OrderBook Component ──────────────────────────────────────────────────────
export const OrderBook = () => {
  const { selectedSymbol, assets } = useMarket();
  const currentAsset = assets.find(a => a.id === selectedSymbol);
  const baseSymbol = selectedSymbol.replace('USDT', '');

  // Smart default grouping based on price
  const [grouping, setGrouping] = useState<Grouping>(1);
  const [isUserGrouping, setIsUserGrouping] = useState(false);

  // Update default grouping when price changes
  useEffect(() => {
    if (!isUserGrouping && currentAsset?.price) {
      setGrouping(suggestGrouping(currentAsset.price));
    }
  }, [currentAsset?.price, isUserGrouping]);

  // When switching symbols, allow auto-suggest again
  useEffect(() => {
    setIsUserGrouping(false);
  }, [selectedSymbol]);

  const { data, isLoading } = useOrderBook(selectedSymbol, grouping);
  const [activeTab, setActiveTab] = useState<'book' | 'trades'>('book');

  const asksReversed = data ? [...data.asks].reverse() : [];

  return (
    <div className="h-full flex flex-col border-t border-main">
      {/* Tab Bar */}
      <div className="px-4 py-0 border-b border-main flex items-center justify-between bg-secondary/20 shrink-0">
        <div className="flex items-center">
          {(['book', 'trades'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors',
                activeTab === tab ? 'border-accent text-main' : 'border-transparent text-muted hover:text-main',
              )}
            >
              {tab === 'book' ? 'Order Book' : 'Recent Trades'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          {/* Grouping Selector */}
          <div className="flex items-center space-x-0.5 bg-secondary border border-main rounded-md p-0.5">
            {GROUPING_OPTIONS.map(g => (
              <button
                key={g}
                onClick={() => {
                  setIsUserGrouping(true);
                  setGrouping(g);
                }}
                className={cn(
                  'px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded transition-all',
                  grouping === g
                    ? 'bg-main text-accent shadow-sm border border-main'
                    : 'text-muted hover:text-main',
                )}
              >
                {g}
              </button>
            ))}
          </div>

          <button className="p-1 text-muted hover:text-main" title="Download"><Download size={11} /></button>
          <button className="p-1 text-muted hover:text-main" title="Share"><Share2 size={11} /></button>
          <button className="p-1 text-muted hover:text-main"><MoreHorizontal size={11} /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {activeTab === 'book' ? (
          /* ─── Order Book ─── */
          <>
            <div className="flex-1 border-r border-main flex flex-col min-h-0">
              <ColHeader baseSymbol={baseSymbol} />

              {isLoading && !data ? (
                <div className="flex-1 flex items-center justify-center">
                  <Activity size={16} className="text-accent animate-pulse" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto thin-scrollbar flex flex-col">
                  {/* Asks (reversed so lowest ask is at the bottom, near the spread) */}
                  <div className="flex-1 flex flex-col justify-end">
                    {asksReversed.map((ask) => (
                      <OrderRow
                        key={ask.price}
                        {...ask}
                        side="ask"
                        grouping={grouping}
                      />
                    ))}
                  </div>

                  {/* Spread row */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/50 border-y border-main shrink-0">
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        'text-[14px] font-mono font-semibold',
                        (currentAsset?.changePercent ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500',
                      )}>
                        {currentAsset?.price
                          ? priceFmt(currentAsset.price, grouping < 1 ? grouping : 1)
                          : '—'}
                      </span>
                      {(currentAsset?.changePercent ?? 0) >= 0
                        ? <span className="text-emerald-500 text-[10px]">↑</span>
                        : <span className="text-rose-500 text-[10px]">↓</span>}
                    </div>
                    {data && (
                      <span className="text-[9px] text-muted font-mono">
                        Spread: {priceFmt(data.spread, grouping)} ({data.spreadPercent.toFixed(3)}%)
                      </span>
                    )}
                  </div>

                  {/* Bids */}
                  <div className="flex flex-col">
                    {(data?.bids ?? []).map((bid) => (
                      <OrderRow
                        key={bid.price}
                        {...bid}
                        side="bid"
                        grouping={grouping}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Depth Summary */}
            <div className="w-52 flex flex-col justify-center items-center text-center p-4 space-y-3 bg-secondary/10 shrink-0">
              <div className="w-11 h-11 rounded-full bg-main flex items-center justify-center border border-main shadow-sm">
                <Activity size={18} className="text-accent" />
              </div>
              <div>
                <div className="text-[12px] font-semibold">{baseSymbol} Depth</div>
                {data && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-emerald-500">Bids</span>
                      <span className="font-mono text-muted">{qtyFmt(data.bids.reduce((s, b) => s + b.quantity, 0))}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-rose-500">Asks</span>
                      <span className="font-mono text-muted">{qtyFmt(data.asks.reduce((s, a) => s + a.quantity, 0))}</span>
                    </div>
                    {/* Bid/Ask ratio bar */}
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden flex">
                      {(() => {
                        const bidVol = data.bids.reduce((s, b) => s + b.quantity, 0);
                        const askVol = data.asks.reduce((s, a) => s + a.quantity, 0);
                        const total = bidVol + askVol;
                        const bidPct = total > 0 ? (bidVol / total) * 100 : 50;
                        return (
                          <>
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${bidPct}%` }} />
                            <div className="bg-rose-500 h-full flex-1" />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ─── Recent Trades Placeholder ─── */
          <div className="flex-1 flex items-center justify-center text-muted text-[12px]">
            Real-time trades feed — coming soon
          </div>
        )}
      </div>
    </div>
  );
};
