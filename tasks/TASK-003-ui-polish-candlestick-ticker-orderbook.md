# TASK-003: UI Polish — Candlestick Fix + Top Bar + Ticker + Real Order Book

**Status:** [x] Done  
**Priority:** High  
**Type:** Feature + Bugfix  
**Created:** 2026-03-23  
**Updated:** 2026-03-23  
**Assignee:** AI Agent

## Context

4 issues from user review of TASK-002:
1. Candlestick rendering is broken (shape/wick not drawing correctly)
2. Top bar missing WatchlistDropdown + quick search
3. Need live scrolling ticker bar at the bottom with connection status
4. Order book is fake (hardcoded seeded values) — need real Binance depth data + grouping selector

## Acceptance Criteria

- [x] Candlestick uses proportional math within Recharts bar bbox — wick + body render correctly
- [x] Top header restores WatchlistDropdown + search input (like original)
- [x] Bottom TickerBar: live scrolling coins, slows on hover, click to select coin
- [x] Bottom TickerBar: "Kết nối ổn định" status indicator on the left
- [x] Order book uses real Binance `/depth` API data (not seeded random)
- [x] Order book grouping selector: 0.01 / 0.1 / 1 / 10 / 50 / 100 / 1000
- [x] Order book shows depth bar visualization per row

## Files Changed

- `src/app/globals.css` (ticker animation added)
- `src/components/MainChart.tsx` (candlestick fix)
- `src/app/page.tsx` (restore header, add TickerBar, use OrderBook)
- `src/components/TickerBar.tsx` (created)
- `src/hooks/useOrderBook.ts` (created)
- `src/components/OrderBook.tsx` (created)
