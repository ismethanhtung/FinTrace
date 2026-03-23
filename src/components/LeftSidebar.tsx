"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';
import { useMarket } from '../context/MarketContext';
import { Asset } from '../services/binanceService';
import { TokenAvatar } from './TokenAvatar';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronLeft,
  ChevronRight,
  Flame,
  BarChart2,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Formatters ──────────────────────────────────────────────────────────────
const priceFmt = (v: number) =>
  v < 0.001 ? v.toFixed(6) : v < 1 ? v.toFixed(4) : v < 100 ? v.toFixed(3) : v.toLocaleString('en-US', { minimumFractionDigits: 2 });

// ─── Fake recent trades (live feel using asset price) ─────────────────────────
function generateTrades(price: number, count = 14): { price: number; qty: number; time: string; isBuy: boolean }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const offset = (Math.random() - 0.5) * price * 0.001;
    const p = price + offset;
    const isBuy = Math.random() > 0.5;
    const t = new Date(now.getTime() - i * 3000 - Math.random() * 2000);
    return {
      price: p,
      qty: parseFloat((Math.random() * 2).toFixed(4)),
      isBuy,
      time: t.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  });
}

// ─── Coin Row ─────────────────────────────────────────────────────────────────
const CoinRow = ({ asset, isSelected, onClick }: { asset: Asset; isSelected: boolean; onClick: () => void }) => (
  <div
    onClick={onClick}
    className={cn(
      'flex items-center justify-between px-3 py-2 cursor-pointer transition-all group border-b border-main last:border-0',
      isSelected ? 'bg-accent/8' : 'hover:bg-secondary'
    )}
  >
    <div className="flex items-center space-x-2 min-w-0">
      <TokenAvatar
        symbol={asset.symbol}
        logoUrl={asset.logoUrl}
        size={24}
        selected={isSelected}
      />
      <div className="min-w-0">
        <div className={cn('text-[11px] font-semibold truncate', isSelected && 'text-accent')}>{asset.symbol}</div>
        <div className="text-[9px] text-muted truncate">{asset.id}</div>
      </div>
    </div>
    <div className="text-right shrink-0 ml-2">
      <div className="text-[11px] font-mono">{priceFmt(asset.price)}</div>
      <div className={cn('text-[10px] font-medium', asset.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
        {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
      </div>
    </div>
  </div>
);

// ─── Movers: chỉ coin thật sự lãi / lỗ (tránh +0.03% nằm trong tab Losers) ───
const EPS = 1e-8;

function formatPctSigned(p: number) {
  const s = p >= 0 ? '+' : '-';
  return `${s}${Math.abs(p).toFixed(2)}%`;
}

// ─── Top Movers Section ──────────────────────────────────────────────────────
const TopMovers = ({ assets, onSelect }: { assets: Asset[]; onSelect: (id: string) => void }) => {
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers');

  const sorted = (() => {
    if (tab === 'gainers') {
      return [...assets]
        .filter((a) => a.changePercent > EPS)
        .sort((a, b) => b.changePercent - a.changePercent);
    }
    return [...assets]
      .filter((a) => a.changePercent < -EPS)
      .sort((a, b) => a.changePercent - b.changePercent);
  })();

  return (
    <div className="flex flex-1 min-h-0 flex-col border-t border-main">
      <div className="flex shrink-0 items-center justify-between px-3 py-2">
        <div className="flex items-center space-x-1.5">
          <Flame size={12} className="text-orange-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">24h %</span>
        </div>
        <div className="flex items-center bg-secondary rounded p-0.5">
          <button
            onClick={() => setTab('gainers')}
            className={cn('px-2 py-0.5 text-[9px] font-semibold rounded transition-all', tab === 'gainers' ? 'bg-emerald-500 text-white' : 'text-muted')}
          >
            Gainers
          </button>
          <button
            onClick={() => setTab('losers')}
            className={cn('px-2 py-0.5 text-[9px] font-semibold rounded transition-all', tab === 'losers' ? 'bg-rose-500 text-white' : 'text-muted')}
          >
            Losers
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar">
        {sorted.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-muted">
            {tab === 'gainers' ? 'Không có coin tăng trong danh sách.' : 'Không có coin giảm trong danh sách.'}
          </div>
        ) : (
          sorted.map((asset, i) => (
            <div
              key={asset.id}
              onClick={() => onSelect(asset.id)}
              className="flex items-center justify-between px-3 py-2 border-b border-main last:border-0 hover:bg-secondary cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-[10px] text-muted w-5 shrink-0 tabular-nums">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold truncate">{asset.symbol}</div>
                  <div className="text-[9px] text-muted font-mono tabular-nums">{priceFmt(asset.price)}</div>
                </div>
              </div>
              <div
                className={cn(
                  'flex shrink-0 items-center space-x-1 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  asset.changePercent > EPS
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : 'bg-rose-500/15 text-rose-500',
                )}
              >
                {asset.changePercent > EPS ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                <span>{formatPctSigned(asset.changePercent)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

type TradeRow = {
  id: number;
  price: number;
  qty: number;
  time: string;
  isBuy: boolean;
};

// ─── Recent Market Trades Section (không animate từng dòng — tránh giật layout) ─
const RecentTrades = ({ price }: { price: number }) => {
  const tradeIdRef = useRef(0);
  const [trades, setTrades] = useState<TradeRow[]>(() =>
    generateTrades(price, 16).map((t) => ({ ...t, id: tradeIdRef.current++ })),
  );

  useEffect(() => {
    if (!price) return;
    setTrades(
      generateTrades(price, 16).map((t) => ({ ...t, id: tradeIdRef.current++ })),
    );
  }, [price]);

  useEffect(() => {
    if (!price) return;
    const timer = setInterval(() => {
      setTrades((prev) => {
        const raw = generateTrades(price, 1)[0];
        const row: TradeRow = { ...raw, id: tradeIdRef.current++ };
        return [row, ...prev.slice(0, 39)];
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [price]);

  return (
    <div className="flex flex-1 min-h-0 flex-col border-t border-main">
      <div className="flex shrink-0 items-center space-x-1.5 border-b border-main px-3 py-2">
        <Clock size={12} className="text-muted" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Market Trades</span>
        <span className="ml-auto">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        </span>
      </div>
      <div className="grid shrink-0 grid-cols-3 border-b border-main px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted">
        <span>Price (USDT)</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Time</span>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto thin-scrollbar">
        {trades.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-3 border-b border-main px-3 py-1 last:border-0 hover:bg-secondary"
          >
            <span
              className={cn(
                'text-[10px] font-mono font-medium tabular-nums',
                t.isBuy ? 'text-emerald-500' : 'text-rose-500',
              )}
            >
              {priceFmt(t.price)}
            </span>
            <span className="text-center text-[10px] font-mono tabular-nums text-muted">{t.qty.toFixed(4)}</span>
            <span className="text-right text-[10px] font-mono tabular-nums text-muted">{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Left Sidebar ────────────────────────────────────────────────────────
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 260;

export const LeftSidebar = () => {
  const { assets, selectedSymbol, setSelectedSymbol } = useMarket();
  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<'list' | 'movers' | 'trades'>('list');
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const selectedAsset = assets.find(a => a.id === selectedSymbol);

  const filteredAssets = assets.filter(asset =>
    asset.symbol.toLowerCase().includes(search.toLowerCase()),
  );

  // Handle resize drag
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="relative flex h-full min-h-0 shrink-0">
      {/* Sidebar Panel */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ width, minWidth: width, maxWidth: width }}
            className="h-full min-h-0 flex flex-col bg-main border-r border-main overflow-hidden"
          >
            {/* Section nav */}
            <div className="flex items-center border-b border-main shrink-0 bg-secondary/40">
              {[
                { key: 'list', label: 'Coins', icon: BarChart2 },
                { key: 'movers', label: 'Movers', icon: Flame },
                { key: 'trades', label: 'Trades', icon: Activity },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSection(key as any)}
                  className={cn(
                    'flex-1 flex flex-col items-center py-2 text-[9px] font-bold uppercase tracking-wider transition-all border-b-2',
                    section === key
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted hover:text-main'
                  )}
                >
                  <Icon size={13} className="mb-0.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar flex flex-col">
              {/* ── Coin List ── */}
              {section === 'list' && (
                <>
                  {/* Search */}
                  <div className="p-2 border-b border-main">
                    <div className="relative">
                      <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        placeholder="Search coins..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-secondary border border-main rounded-md py-1.5 pl-7 pr-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                      />
                    </div>
                  </div>

                  {/* Column headers */}
                  <div className="px-3 py-1.5 grid grid-cols-2 text-[9px] font-semibold text-muted uppercase tracking-wider border-b border-main bg-secondary/30">
                    <span>Symbol</span>
                    <span className="text-right">Price / 24h</span>
                  </div>

                  {/* Coin rows */}
                  <div>
                    {filteredAssets.length === 0 ? (
                      <div className="p-6 text-center text-muted text-[11px]">No coins found</div>
                    ) : (
                      filteredAssets.map(asset => (
                        <CoinRow
                          key={asset.id}
                          asset={asset}
                          isSelected={selectedSymbol === asset.id}
                          onClick={() => setSelectedSymbol(asset.id)}
                        />
                      ))
                    )}
                  </div>
                </>
              )}

              {/* ── Top Movers ── */}
              {section === 'movers' && (
                <div className="flex flex-1 min-h-0 flex-col py-2">
                  <TopMovers assets={assets} onSelect={setSelectedSymbol} />
                </div>
              )}

              {/* ── Market Trades ── */}
              {section === 'trades' && (
                <RecentTrades price={selectedAsset?.price ?? 0} />
              )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resize handle (only when open) */}
      {isOpen && (
        <div
          onMouseDown={onMouseDown}
          className="absolute right-0 top-0 w-1 h-full cursor-col-resize z-20 bg-transparent hover:bg-accent/30 transition-colors group"
          title="Drag to resize"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-12 bg-main border border-main rounded-full group-hover:bg-accent/50 transition-colors" />
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={cn(
          'absolute z-30 flex items-center justify-center w-5 h-10 bg-main border border-main rounded-r-md shadow-sm transition-all hover:bg-secondary top-1/2 -translate-y-1/2',
          isOpen ? 'right-[-20px]' : 'right-[-20px] left-0'
        )}
        title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? <ChevronLeft size={12} className="text-muted" /> : <ChevronRight size={12} className="text-muted" />}
      </button>
    </div>
  );
};
