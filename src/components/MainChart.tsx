import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { useMarket } from '../context/MarketContext';

export const MainChart = () => {
  const { chartData, isLoading, assets, selectedSymbol } = useMarket();
  const currentAsset = assets.find(a => a.id === selectedSymbol);
  
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 flex items-center justify-between border-b border-main">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-[18px] font-semibold">{currentAsset?.name || selectedSymbol.replace('USDT', '')} / USDT</h2>
            <span className="px-1.5 py-0.5 bg-secondary text-muted text-[10px] font-medium rounded">{selectedSymbol}</span>
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-[24px] font-mono font-medium tracking-tighter">
              ${currentAsset?.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[13px] font-medium ${(currentAsset?.changePercent || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {(currentAsset?.changePercent || 0) >= 0 ? '+' : ''}{currentAsset?.changePercent.toFixed(2)}% 
              (${Math.abs(currentAsset?.change || 0).toLocaleString('en-US')})
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 bg-secondary p-1 rounded-md border border-main">
          {['1H', '1D', '1W', '1M', '1Y', 'ALL'].map((period) => (
            <button
              key={period}
              className={`px-3 py-1 text-[11px] font-medium rounded transition-colors ${
                period === '1D' 
                  ? 'bg-main text-accent shadow-sm border border-main' 
                  : 'text-muted hover:text-main'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#007AFF" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }} 
              dy={10}
            />
            <YAxis 
              hide 
              domain={['dataMin - 500', 'dataMax + 500']} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--bg-main)', 
                borderRadius: '6px', 
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              itemStyle={{ color: '#007AFF', fontWeight: 600 }}
              labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#007AFF" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
