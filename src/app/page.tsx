"use client";

import React, { useState, useEffect } from 'react';
import { MainChart } from '../components/MainChart';
import { RightPanel } from '../components/RightPanel';
import { UserMenu } from '../components/UserMenu';
import { LeftSidebar } from '../components/LeftSidebar';
import { OrderBook } from '../components/OrderBook';
import { TickerBar } from '../components/TickerBar';
import { WatchlistDropdown } from '../components/AssetList';
import { useMarket } from '../context/MarketContext';
import {
  Moon,
  Sun,
  RefreshCw,
  CloudMoon,
  TrendingUp,
  Search,
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'night';

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { assets, selectedSymbol } = useMarket();

  const currentAsset = assets.find(a => a.id === selectedSymbol);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'night'];
    setTheme(t => themes[(themes.indexOf(t) + 1) % themes.length]);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">

      {/* ── Global Header ── */}
      <header className="h-12 border-b border-main flex items-center justify-between px-4 bg-main z-50 shrink-0">
        <div className="flex items-center space-x-6">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <TrendingUp size={17} className="text-accent" />
            <span className="font-bold text-[14px] tracking-tight">FinTrace</span>
          </div>

          {/* Nav: watchlist dropdown + search */}
          <nav className="flex items-center space-x-2">
            <WatchlistDropdown />
            <div className="h-4 w-px bg-main border-l border-main" />
            <div className="relative group">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Quick search..."
                className="bg-secondary border border-transparent hover:border-main rounded-md py-1.5 pl-8 pr-3 text-[12px] w-44 focus:w-60 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>
          </nav>
        </div>

        {/* Right controls */}
        <div className="flex items-center space-x-3">
          {/* Live price badge for selected coin */}
          {currentAsset && (
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 bg-secondary rounded-md border border-main text-[11px]">
              <span className="font-bold text-accent">{currentAsset.symbol}</span>
              <span className="font-mono">
                ${currentAsset.price < 1
                  ? currentAsset.price.toFixed(4)
                  : currentAsset.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className={currentAsset.changePercent >= 0 ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'}>
                {currentAsset.changePercent >= 0 ? '+' : ''}{currentAsset.changePercent.toFixed(2)}%
              </span>
            </div>
          )}

          <div className="flex items-center space-x-1">
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main"
              title="Toggle Theme"
            >
              {theme === 'light' && <Sun size={14} />}
              {theme === 'dark' && <Moon size={14} />}
              {theme === 'night' && <CloudMoon size={14} />}
              <span className="text-[11px] font-medium capitalize hidden sm:inline">{theme}</span>
            </button>
            <button
              onClick={handleRefresh}
              className={`p-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <button className="px-4 py-1.5 bg-accent text-white rounded-md text-[11px] font-semibold hover:bg-accent/90 transition-colors shadow-sm">
            Trade
          </button>

          <div className="h-5 w-px border-l border-main" />
          <UserMenu />
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar (collapsible + resizable) */}
        <LeftSidebar />

        {/* Center: Chart + Order Book */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Price Chart */}
          <div className="flex-1 min-h-0">
            <MainChart />
          </div>

          {/* Order Book */}
          <div className="h-64 shrink-0">
            <OrderBook />
          </div>
        </div>

        {/* Right Panel: AI Analysis */}
        <RightPanel />
      </div>

      {/* ── Bottom Ticker Bar ── */}
      <TickerBar />
    </div>
  );
}
