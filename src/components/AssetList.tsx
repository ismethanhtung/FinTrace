import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, List, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMarket } from '../context/MarketContext';

const usdFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const WatchlistDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const { assets, selectedSymbol, setSelectedSymbol } = useMarket();

  const filteredAssets = assets.filter(a => 
    a.symbol.toLowerCase().includes(filter.toLowerCase()) ||
    a.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all border",
          isOpen 
            ? "bg-main border-main shadow-sm" 
            : "bg-transparent border-transparent hover:bg-secondary"
        )}
      >
        <List size={14} className="text-muted" />
        <span className="text-[12px] font-medium">Market</span>
        <ChevronDown size={12} className={cn("text-muted transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 mt-2 w-72 bg-main border border-main rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-main bg-secondary/50">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input 
                    type="text" 
                    placeholder="Search by symbol..." 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full bg-main border border-main rounded-md py-1.5 pl-8 pr-3 text-[11px] focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto thin-scrollbar">
                <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider bg-secondary/30">Top Assets (USDT)</div>
                {filteredAssets.length === 0 ? (
                  <div className="p-8 text-center text-muted text-[11px]">No assets found</div>
                ) : (
                  filteredAssets.map((asset) => (
                    <div 
                      key={asset.id}
                      onClick={() => {
                        setSelectedSymbol(asset.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "px-4 py-2.5 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer group border-b border-main last:border-0",
                        selectedSymbol === asset.id && "bg-accent/5"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold",
                          selectedSymbol === asset.id ? "bg-accent text-white" : "bg-secondary text-muted"
                        )}>
                          {asset.symbol[0]}
                        </div>
                        <div>
                          <div className={cn(
                            "text-[12px] font-medium leading-none",
                            selectedSymbol === asset.id && "text-accent"
                          )}>{asset.symbol}</div>
                          <div className="text-[10px] text-muted mt-1">Binance</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-[12px] font-mono font-medium leading-none">
                          ${asset.price < 1 ? asset.price.toFixed(4) : usdFmt.format(asset.price)}
                        </div>
                        <div className={cn(
                          "text-[9px] mt-1 flex items-center justify-end font-medium",
                          asset.change >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {asset.change >= 0 ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}
                          {Math.abs(asset.changePercent).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
