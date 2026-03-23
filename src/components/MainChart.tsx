"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
} from 'recharts';
import { useMarket } from '../context/MarketContext';
import { useChartData, CHART_INTERVALS, EnrichedPoint, Indicator } from '../hooks/useChartData';
import { cn } from '../lib/utils';
import {
  TrendingUp, TrendingDown, BarChart2, LineChart, Info, Activity, ChevronsRight, Loader2, Waves,
} from 'lucide-react';
import { FlowPanel } from './FlowPanel';
import { TokenAvatar } from './TokenAvatar';

// ─── Price formatter ─────────────────────────────────────────────────────────
const priceFmt = (v: number) => {
  if (!v || isNaN(v)) return '—';
  if (v < 0.00001) return v.toFixed(8);
  if (v < 0.001) return v.toFixed(6);
  if (v < 0.01) return v.toFixed(5);
  if (v < 1) return v.toFixed(4);
  if (v < 100) return v.toFixed(3);
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Custom Candlestick Shape ─────────────────────────────────────────────────
const CandleShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || width <= 0 || height <= 0) return <g />;

  const { open, close, high, low } = payload as EnrichedPoint;
  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#f43f5e';
  const range = high - low;

  const cx = x + width / 2;
  const cw = Math.max(2, width * 0.65);

  if (range === 0) {
    return <line x1={x} x2={x + width} y1={y} y2={y} stroke={color} strokeWidth={1.5} />;
  }

  const bodyTopPrice = Math.max(open, close);
  const bodyBotPrice = Math.min(open, close);
  const bodyTopY = y + ((high - bodyTopPrice) / range) * height;
  const bodyBotY = y + ((high - bodyBotPrice) / range) * height;
  const bodyH = Math.max(1, bodyBotY - bodyTopY);

  return (
    <g>
      <line x1={cx} y1={y} x2={cx} y2={bodyTopY} stroke={color} strokeWidth={1} />
      <rect
        x={cx - cw / 2}
        y={bodyTopY}
        width={cw}
        height={bodyH}
        fill={color}
        stroke={color}
        strokeWidth={0.5}
        rx={0.5}
      />
      <line x1={cx} y1={bodyBotY} x2={cx} y2={y + height} stroke={color} strokeWidth={1} />
    </g>
  );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d: EnrichedPoint = payload[0]?.payload;
  if (!d) return null;
  const isUp = d.close >= d.open;

  const volFmt = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : `${(v / 1_000).toFixed(1)}K`;

  return (
    <div className="bg-main border border-main rounded-lg shadow-xl p-3 text-[11px] min-w-[180px]">
      <div className="text-muted font-medium mb-2">{label}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-muted">Open</span>
        <span className="font-mono text-right">{priceFmt(d.open)}</span>
        <span className="text-muted">High</span>
        <span className="font-mono text-right text-emerald-500">{priceFmt(d.high)}</span>
        <span className="text-muted">Low</span>
        <span className="font-mono text-right text-rose-500">{priceFmt(d.low)}</span>
        <span className="text-muted">Close</span>
        <span className={cn('font-mono text-right font-semibold', isUp ? 'text-emerald-500' : 'text-rose-500')}>
          {priceFmt(d.close)}
        </span>
        <span className="text-muted">Volume</span>
        <span className="font-mono text-right text-accent">{volFmt(d.volume)}</span>
      </div>
      {(d.MA7 != null || d.MA25 != null || d.EMA99 != null) && (
        <div className="mt-2 pt-2 border-t border-main grid grid-cols-2 gap-x-4 gap-y-1">
          {d.MA7 != null && (
            <><span style={{ color: '#f59e0b' }}>MA(7)</span><span className="font-mono text-right">{priceFmt(d.MA7)}</span></>
          )}
          {d.MA25 != null && (
            <><span style={{ color: '#a78bfa' }}>MA(25)</span><span className="font-mono text-right">{priceFmt(d.MA25)}</span></>
          )}
          {d.EMA99 != null && (
            <><span style={{ color: '#38bdf8' }}>EMA(99)</span><span className="font-mono text-right">{priceFmt(d.EMA99)}</span></>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Coin Info Panel ──────────────────────────────────────────────────────────
const CoinInfoPanel = () => {
  const { assets, selectedSymbol } = useMarket();
  const asset = assets.find(a => a.id === selectedSymbol);
  if (!asset)
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-[12px]">
        Loading...
      </div>
    );

  const rows = [
    { label: 'Last Price', value: `$${priceFmt(asset.price)}` },
    {
      label: '24h Change',
      value: `${asset.changePercent >= 0 ? '+' : ''}${asset.changePercent.toFixed(2)}%`,
      color: asset.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500',
    },
    { label: '24h High', value: `$${priceFmt(asset.high24h ?? 0)}` },
    { label: '24h Low', value: `$${priceFmt(asset.low24h ?? 0)}` },
    { label: '24h Volume', value: asset.volume24h },
    { label: 'Market Cap', value: asset.marketCap },
  ];

  return (
    <div className="flex-1 overflow-y-auto thin-scrollbar p-5 space-y-4">
      <div className="flex items-center space-x-3 pb-4 border-b border-main">
        <TokenAvatar
          symbol={asset.symbol}
          logoUrl={asset.logoUrl}
          size={40}
        />
        <div>
          <div className="font-bold text-[15px]">{asset.symbol}</div>
          <div className="text-muted text-[11px]">{asset.id} · Binance</div>
        </div>
        <div className="ml-auto">
          {asset.changePercent >= 0
            ? <TrendingUp size={20} className="text-emerald-500" />
            : <TrendingDown size={20} className="text-rose-500" />}
        </div>
      </div>

      <div className="rounded-lg border border-main overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={i}
            className={cn('flex items-center justify-between px-4 py-3', i % 2 === 0 ? 'bg-secondary/40' : '')}
          >
            <span className="text-[11px] text-muted">{row.label}</span>
            <span className={cn('text-[12px] font-mono font-medium', row.color ?? '')}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          About {asset.symbol}
        </div>
        <p className="text-[12px] text-muted leading-relaxed">
          {asset.symbol} is a digital asset traded on Binance. Real-time price and volume data is
          sourced directly from the Binance exchange REST API, refreshed every 5 seconds.
        </p>
      </div>
    </div>
  );
};

// ─── Main Chart ───────────────────────────────────────────────────────────────
export const MainChart = () => {
  const { selectedSymbol, assets } = useMarket();
  const {
    data,
    isLoading,
    isFetchingHistory,
    interval,
    setInterval,
    chartType,
    setChartType,
    activeIndicators,
    toggleIndicator,
    panBy,
    zoomBy,
    isPanned,
    goToLatest,
  } = useChartData(selectedSymbol);

  const [activeTab, setActiveTab] = useState<'chart' | 'info' | 'flow'>('chart');

  const currentAsset = assets.find(a => a.id === selectedSymbol);
  const isPositive = (currentAsset?.changePercent ?? 0) >= 0;
  const lastPoint = data[data.length - 1];

  // Price domain with padding
  const allPrices = data.flatMap(d => [d.high, d.low]).filter(v => v > 0);
  const minPrice = allPrices.length ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length ? Math.max(...allPrices) : 0;
  const pad = (maxPrice - minPrice) * 0.06 || maxPrice * 0.01;
  const domain: [number, number] = [minPrice - pad, maxPrice + pad];

  const chartData = data.map(d => ({ ...d, fullRange: [d.low, d.high] }));

  const indicators: { key: Indicator; label: string; color: string }[] = [
    { key: 'MA7',   label: 'MA(7)',   color: '#f59e0b' },
    { key: 'MA25',  label: 'MA(25)',  color: '#a78bfa' },
    { key: 'EMA99', label: 'EMA(99)', color: '#38bdf8' },
  ];

  const volFmt = useCallback((v: number) => {
    if (!v) return '—';
    return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : `${(v / 1_000).toFixed(0)}K`;
  }, []);

  // ─── Pan & Zoom Handlers ──────────────────────────────────────────────────
  // Track lastX to get per-frame delta; accumulate sub-candle pixels in remainder.
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastDragX = useRef(0);
  const subCanclePxRemainder = useRef(0); // fractional pixel overflow between panBy calls

  // Pixels per candle — based on container width and current visible count
  const pxPerCandle = useCallback((): number => {
    const width = chartAreaRef.current?.offsetWidth ?? 600;
    const marginRight = 60; // approx YAxis width
    const effective = width - marginRight;
    return effective / Math.max(1, data.length);
  }, [data.length]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTab !== 'chart') return;
    isDragging.current = true;
    lastDragX.current = e.clientX;
    subCanclePxRemainder.current = 0;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, [activeTab]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastDragX.current; // delta from last frame
      lastDragX.current = e.clientX;

      const ppc = pxPerCandle();
      // Accumulate this frame's pixels with any leftover from last frame
      const total = subCanclePxRemainder.current + dx;
      // How many whole candles did we cover?
      const candleCount = Math.trunc(total / ppc);
      // Save leftover sub-candle pixels
      subCanclePxRemainder.current = total - candleCount * ppc;

      if (candleCount !== 0) {
        // Dragging right (positive dx) = show newer candles (pan right = decrease endIndex offset)
        // Dragging left (negative dx) = show older candles (pan left = increase endIndex offset)
        panBy(-candleCount); // panBy positive = older; negative = newer
      }
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [panBy, pxPerCandle]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (activeTab !== 'chart') return;
    e.preventDefault();
    const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);

    if (isHorizontal || e.shiftKey) {
      // Horizontal scroll / shift+wheel → pan
      const ppc = pxPerCandle();
      const candles = Math.round(e.deltaX / ppc) || (e.deltaY > 0 ? -1 : 1);
      panBy(candles);
    } else {
      // Vertical wheel → zoom (positive deltaY = zoom out = more candles)
      const zoomStep = e.deltaY > 0 ? 5 : -5;
      zoomBy(zoomStep);
    }
  }, [activeTab, panBy, zoomBy, pxPerCandle]);

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div className="px-5 pt-3 pb-0 border-b border-main shrink-0">
        {/* Price row */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-[16px] font-bold tracking-tight">
                {currentAsset?.name ?? selectedSymbol.replace('USDT', '')}
                <span className="text-muted font-normal text-[12px] ml-1">/ USDT</span>
              </h2>
              <span className="px-1 py-0.5 bg-secondary text-muted text-[9px] font-semibold rounded uppercase">
                {selectedSymbol}
              </span>
            </div>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-[24px] font-mono font-semibold tracking-tighter leading-none">
                ${priceFmt(currentAsset?.price ?? 0)}
              </span>
              <span className={cn('text-[12px] font-semibold flex items-center space-x-1', isPositive ? 'text-emerald-500' : 'text-rose-500')}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>
                  {isPositive ? '+' : ''}{currentAsset?.changePercent.toFixed(2)}%
                  <span className="ml-1 opacity-75">
                    ({isPositive ? '+' : ''}${Math.abs(currentAsset?.change ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                  </span>
                </span>
              </span>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center space-x-1 bg-secondary p-0.5 rounded-lg border border-main">
            {(['chart', 'info', 'flow'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex items-center space-x-1 px-2.5 py-1 text-[10px] font-medium rounded-md transition-all',
                  activeTab === tab
                    ? 'bg-main text-accent shadow-sm border border-main'
                    : 'text-muted hover:text-main',
                )}
              >
                {tab === 'chart' ? <BarChart2 size={11} /> : tab === 'info' ? <Info size={11} /> : <Waves size={11} />}
                <span>{tab === 'info' ? 'Coin Info' : tab === 'flow' ? 'Flow' : 'Chart'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Stats Section ── */}
        <div className="py-1.5 border-t border-dashed border-main/60 space-y-1">
          {/* Row 1: Current candle OHLCV */}
          {lastPoint && (
            <div className="flex items-center space-x-3 text-[10px] flex-wrap gap-y-0.5">
              <span className="text-muted font-semibold uppercase tracking-wider mr-1">{interval}</span>
              {[
                { label: 'O', value: priceFmt(lastPoint.open), cls: 'text-main' },
                { label: 'H', value: priceFmt(lastPoint.high), cls: 'text-emerald-500' },
                { label: 'L', value: priceFmt(lastPoint.low),  cls: 'text-rose-500' },
                {
                  label: 'C',
                  value: priceFmt(lastPoint.close),
                  cls: lastPoint.close >= lastPoint.open ? 'text-emerald-500' : 'text-rose-500',
                },
                { label: 'Vol', value: volFmt(lastPoint.volume), cls: 'text-accent' },
              ].map(item => (
                <div key={item.label} className="flex items-center space-x-0.5">
                  <span className="text-muted">{item.label}:</span>
                  <span className={cn('font-mono font-medium', item.cls)}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Row 2: 24h market data */}
          {currentAsset && (
            <div className="flex items-center space-x-3 text-[10px] flex-wrap gap-y-0.5">
              <span className="text-muted font-semibold uppercase tracking-wider mr-1">24h</span>
              <div className="flex items-center space-x-0.5">
                <span className="text-muted">Chg:</span>
                <span className={cn('font-mono font-medium', isPositive ? 'text-emerald-500' : 'text-rose-500')}>
                  {isPositive ? '+' : ''}{priceFmt(currentAsset.change)}
                </span>
                <span className={cn('font-mono', isPositive ? 'text-emerald-500/70' : 'text-rose-500/70')}>
                  ({isPositive ? '+' : ''}{currentAsset.changePercent.toFixed(2)}%)
                </span>
              </div>
              <div className="flex items-center space-x-0.5">
                <span className="text-muted">H:</span>
                <span className="font-mono text-emerald-500">{priceFmt(currentAsset.high24h ?? 0)}</span>
              </div>
              <div className="flex items-center space-x-0.5">
                <span className="text-muted">L:</span>
                <span className="font-mono text-rose-500">{priceFmt(currentAsset.low24h ?? 0)}</span>
              </div>
              {currentAsset.baseVolume > 0 && (
                <div className="flex items-center space-x-0.5">
                  <span className="text-muted">Vol({currentAsset.symbol}):</span>
                  <span className="font-mono text-main">
                    {currentAsset.baseVolume >= 1_000_000
                      ? `${(currentAsset.baseVolume / 1_000_000).toFixed(2)}M`
                      : currentAsset.baseVolume >= 1000
                      ? `${(currentAsset.baseVolume / 1000).toFixed(2)}K`
                      : currentAsset.baseVolume.toFixed(2)}
                  </span>
                </div>
              )}
              {currentAsset.quoteVolumeRaw > 0 && (
                <div className="flex items-center space-x-0.5">
                  <span className="text-muted">Vol(USDT):</span>
                  <span className="font-mono text-accent">
                    {currentAsset.quoteVolumeRaw >= 1_000_000_000
                      ? `${(currentAsset.quoteVolumeRaw / 1_000_000_000).toFixed(2)}B`
                      : `${(currentAsset.quoteVolumeRaw / 1_000_000).toFixed(1)}M`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls (chart tab only) */}
        {activeTab === 'chart' && (
          <div className="flex items-center justify-between py-1.5">
            {/* Interval pills */}
            <div className="flex items-center space-x-0.5">
              {CHART_INTERVALS.map(iv => (
                <button
                  key={iv}
                  onClick={() => setInterval(iv)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-medium rounded transition-all',
                    interval === iv
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-muted hover:text-main hover:bg-secondary',
                  )}
                >
                  {iv}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              {/* "Go to latest" badge when panned */}
              {isPanned && (
                <button
                  onClick={goToLatest}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded border border-accent/40 text-accent text-[9px] font-medium hover:bg-accent/10 transition-colors"
                >
                  <ChevronsRight size={11} />
                  <span>Latest</span>
                </button>
              )}

              {/* History loading indicator */}
              {isFetchingHistory && (
                <Loader2 size={11} className="text-muted animate-spin" />
              )}

              {/* Chart type */}
              <div className="flex items-center bg-secondary border border-main rounded-md p-0.5">
                <button
                  onClick={() => setChartType('candlestick')}
                  title="Candlestick"
                  className={cn('p-1 rounded transition-all', chartType === 'candlestick' ? 'bg-main text-accent shadow-sm' : 'text-muted hover:text-main')}
                >
                  <BarChart2 size={12} />
                </button>
                <button
                  onClick={() => setChartType('area')}
                  title="Area"
                  className={cn('p-1 rounded transition-all', chartType === 'area' ? 'bg-main text-accent shadow-sm' : 'text-muted hover:text-main')}
                >
                  <LineChart size={12} />
                </button>
              </div>

              {/* Indicator toggles */}
              <div className="flex items-center space-x-1">
                {indicators.map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => toggleIndicator(key)}
                    style={activeIndicators.has(key) ? { borderColor: color, color } : {}}
                    className={cn(
                      'px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded border transition-all',
                      activeIndicators.has(key) ? 'bg-transparent' : 'border-main text-muted hover:border-main',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Chart / Info / Flow ── */}
      {activeTab === 'info' ? (
        <CoinInfoPanel />
      ) : activeTab === 'flow' ? (
        <FlowPanel />
      ) : (
        <div
          ref={chartAreaRef}
          className="flex-1 min-h-0 relative select-none"
          style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onWheel={onWheel}
        >
          {isLoading && data.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-main/60 z-10">
              <div className="flex flex-col items-center space-y-2">
                <Activity size={18} className="text-accent animate-pulse" />
                <span className="text-muted text-[11px]">Loading chart…</span>
              </div>
            </div>
          )}

          {/* Pan hint overlay — only on first load */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <span className="text-[9px] text-muted/50 select-none">
              Drag to pan · Scroll to zoom
            </span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              /* ─── AREA ─── */
              <ComposedChart data={data} margin={{ top: 8, right: 60, bottom: 4, left: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#007AFF" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#007AFF" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} dy={6} interval="preserveStartEnd" />
                <YAxis domain={domain} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={60} tickFormatter={priceFmt} orientation="right" />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="close" stroke="#007AFF" strokeWidth={2} fill="url(#areaGrad)" dot={false} animationDuration={500} />
                {activeIndicators.has('MA7')   && <Line type="monotone" dataKey="MA7"   stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />}
                {activeIndicators.has('MA25')  && <Line type="monotone" dataKey="MA25"  stroke="#a78bfa" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />}
                {activeIndicators.has('EMA99') && <Line type="monotone" dataKey="EMA99" stroke="#38bdf8" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />}
              </ComposedChart>
            ) : (
              /* ─── CANDLESTICK ─── */
              <ComposedChart data={chartData} margin={{ top: 8, right: 60, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} dy={6} interval="preserveStartEnd" />
                <YAxis domain={domain} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={60} tickFormatter={priceFmt} orientation="right" />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="fullRange" shape={<CandleShape />} isAnimationActive={false} maxBarSize={20} />
                {activeIndicators.has('MA7')   && <Line type="monotone" dataKey="MA7"   stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />}
                {activeIndicators.has('MA25')  && <Line type="monotone" dataKey="MA25"  stroke="#a78bfa" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />}
                {activeIndicators.has('EMA99') && <Line type="monotone" dataKey="EMA99" stroke="#38bdf8" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />}
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
