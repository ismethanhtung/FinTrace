"use client";

import React, { useState, useEffect } from 'react';
import { MainChart } from '../components/MainChart';
import { WatchlistDropdown } from '../components/AssetList';
import { RightPanel } from '../components/RightPanel';
import { UserMenu } from '../components/UserMenu';
import { 
  Moon, 
  Sun, 
  RefreshCw, 
  Download, 
  Share2,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Search,
  Activity,
  CloudMoon
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'night';

// Tạo số giả ngẫu nhiên deterministic dựa trên seed để SSR và client render ra cùng một giá trị.
function seeded01(seed: number) {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 0..1
}

import { useMarket } from '../context/MarketContext';

export default function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { assets, selectedSymbol, isLoading } = useMarket();
  
  const currentAsset = assets.find(a => a.id === selectedSymbol);
  const baseSymbol = selectedSymbol.replace('USDT', '');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'night'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const midPrice = currentAsset?.price || 0;

  return (
    <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
      {/* Global Header */}
      <header className="h-12 border-b border-main flex items-center justify-between px-4 bg-main z-50">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <TrendingUp size={18} className="text-accent" />
            <span className="font-bold text-[15px] tracking-tight">FinTrace</span>
          </div>

          <nav className="flex items-center space-x-1">
            <WatchlistDropdown />
            <div className="h-4 w-[1px] bg-main border-l border-main mx-2"></div>
            <div className="relative group">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input 
                type="text" 
                placeholder="Quick search..." 
                className="bg-secondary border border-transparent hover:border-main rounded-md py-1.5 pl-8 pr-3 text-[12px] w-48 focus:w-64 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <button 
              onClick={toggleTheme}
              className="flex items-center space-x-2 px-3 py-1.5 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary border border-transparent hover:border-main"
              title="Toggle Theme (Light / Dark / Night)"
            >
              {theme === 'light' && <Sun size={15} />}
              {theme === 'dark' && <Moon size={15} />}
              {theme === 'night' && <CloudMoon size={15} />}
              <span className="text-[11px] font-medium capitalize">{theme}</span>
            </button>
            <button 
              onClick={handleRefresh}
              className={`p-2 text-muted hover:text-main transition-colors rounded-md hover:bg-secondary ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={15} />
            </button>
          </div>
          
          <button className="px-4 py-1.5 bg-accent text-white rounded-md text-[12px] font-semibold hover:bg-accent/90 transition-colors shadow-sm">
            Trade
          </button>

          <div className="h-6 w-[1px] border-l border-main"></div>
          
          <UserMenu />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Multi-pane Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Center Pane: Chart & Details */}
          <div className="flex-1 flex flex-col min-w-0 bg-main">
            <div className="flex-1 min-h-0">
              <MainChart />
            </div>
            
            {/* Bottom Pane: Order Book / History */}
            <div className="h-72 border-t border-main flex flex-col">
              <div className="px-4 py-2 border-b border-main flex items-center justify-between bg-secondary/30">
                <div className="flex items-center space-x-6">
                  <button className="text-[10px] font-bold uppercase tracking-widest border-b-2 border-accent pb-1">Order Book</button>
                  <button className="text-[10px] font-bold uppercase tracking-widest text-muted pb-1 hover:text-main transition-colors">Recent Trades</button>
                  <button className="text-[10px] font-bold uppercase tracking-widest text-muted pb-1 hover:text-main transition-colors">Analytical Depth</button>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="p-1 text-muted hover:text-main" title="Download Data"><Download size={12} /></button>
                  <button className="p-1 text-muted hover:text-main" title="Share Analysis"><Share2 size={12} /></button>
                  <button className="p-1 text-muted hover:text-main"><MoreHorizontal size={12} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex">
                <div className="flex-1 border-r border-main p-4 overflow-y-auto thin-scrollbar">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-muted text-left">
                        <th className="font-medium pb-3">Price (USDT)</th>
                        <th className="font-medium pb-3 text-right">Amount ({baseSymbol})</th>
                        <th className="font-medium pb-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {[...Array(6)].reverse().map((_, i) => {
                        const price = midPrice + (i + 1) * (midPrice * 0.0001);
                        return (
                          <tr key={i} className="hover:bg-rose-500/5 group">
                            <td className="py-1 text-rose-500">{price.toFixed(midPrice < 10 ? 4 : 2)}</td>
                            <td className="py-1 text-right">{(seeded01(1000 + i * 10 + 1) * 2).toFixed(4)}</td>
                            <td className="py-1 text-right text-muted">{(seeded01(1000 + i * 10 + 2) * 5).toFixed(1)}k</td>
                          </tr>
                        );
                      })}
                      <tr className="border-y border-main bg-secondary/50">
                        <td colSpan={3} className="py-2.5 text-center font-sans font-semibold text-[14px]">
                          ${midPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} 
                          <span className="text-[10px] text-muted font-normal ml-2">Real-time Spread: $0.01</span>
                        </td>
                      </tr>
                      {[...Array(6)].map((_, i) => {
                        const price = midPrice - (i + 1) * (midPrice * 0.0001);
                        return (
                          <tr key={i} className="hover:bg-emerald-500/5 group">
                            <td className="py-1 text-emerald-500">{price.toFixed(midPrice < 10 ? 4 : 2)}</td>
                            <td className="py-1 text-right">{(seeded01(2000 + i * 10 + 1) * 2).toFixed(4)}</td>
                            <td className="py-1 text-right text-muted">{(seeded01(2000 + i * 10 + 2) * 5).toFixed(1)}k</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="w-1/3 p-6 flex flex-col justify-center items-center text-center space-y-4 bg-secondary/20">
                  <div className="w-14 h-14 rounded-full bg-main flex items-center justify-center border border-main shadow-sm">
                    <Activity size={24} className="text-accent" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold">{baseSymbol} Market Depth</div>
                    <p className="text-[11px] text-muted mt-2 max-w-[180px] leading-relaxed">
                      Liquidity is currently high. Volatility index: {(seeded01(3000) * 20 + 5).toFixed(1)} (Low). Order execution is optimal for {baseSymbol}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane: AI Analysis */}
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
