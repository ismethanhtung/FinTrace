import React, { useState } from 'react';
import { MOCK_ASSETS } from '../lib/mockData';
import { cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, List, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const usdFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const WatchlistDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);

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
        <span className="text-[12px] font-medium">Watchlist</span>
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
                    placeholder="Filter watchlist..." 
                    className="w-full bg-main border border-main rounded-md py-1 pl-8 pr-3 text-[11px] focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="max-h-[350px] overflow-y-auto thin-scrollbar">
                {/* Recents Section */}
                <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider bg-secondary/30">Recent Assets</div>
                {MOCK_ASSETS.slice(0, 3).map((asset) => (
                  <div 
                    key={`recent-${asset.id}`}
                    className="px-4 py-2 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer group border-b border-main/50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold text-muted">
                        {asset.symbol[0]}
                      </div>
                      <div className="text-[11px] font-medium">{asset.symbol}</div>
                    </div>
                    <div className={cn(
                      "text-[10px] font-medium",
                      asset.change >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {asset.changePercent}%
                    </div>
                  </div>
                ))}

                <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider bg-secondary/30">Watchlist</div>
                {MOCK_ASSETS.map((asset) => (
                  <div 
                    key={asset.id}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer group border-b border-main last:border-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted">
                        {asset.symbol[0]}
                      </div>
                      <div>
                        <div className="text-[12px] font-medium leading-none">{asset.symbol}</div>
                        <div className="text-[10px] text-muted mt-1">{asset.name}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-[12px] font-mono font-medium leading-none">
                        ${usdFmt.format(asset.price)}
                      </div>
                      <div className={cn(
                        "text-[9px] mt-1 flex items-center justify-end font-medium",
                        asset.change >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {asset.change >= 0 ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}
                        {Math.abs(asset.changePercent)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-2 border-t border-main text-center">
                <button className="text-[11px] text-accent font-medium hover:underline">Manage Watchlist</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
