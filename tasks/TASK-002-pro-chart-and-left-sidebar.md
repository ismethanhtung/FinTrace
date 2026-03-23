# TASK-002: Pro Chart + Collapsible Left Sidebar

**Status:** [x] In Progress  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-03-23  
**Updated:** 2026-03-23  
**Assignee:** AI Agent

## Context

The current chart is a basic area chart with non-functional time interval buttons. The user wants:
1. A professional Binance-style chart: candlestick + area, working intervals (1H/1D/1W/1M/1Y/ALL), OHLCV header bar, technical indicators (MA, EMA, WMA), chart type switcher, plus a "Coin Info" tab next to the chart.
2. A left sidebar (collapsible + resizable) with: coin list, top movers (gainers/losers), recent trades feed.

## Acceptance Criteria

- [x] Time interval buttons (1M, 5M, 15M, 1H, 4H, 1D, 1W) are wired to Binance klines API
- [x] Chart type toggle: Candlestick / Area Line
- [x] OHLCV stats bar below the price header (Open, High, Low, Close, Volume)
- [x] Overlay toggles: MA(7), MA(25), EMA(99)  
- [x] Chart tab + Coin Info tab — switch between chart and coin metadata
- [x] Left sidebar: coin list with search, category tabs (All / Gainers / Losers)
- [x] Left sidebar: Top Movers section (biggest % change coins)
- [x] Left sidebar: Recent Trades live feed section
- [x] Left sidebar: collapsible (toggle button) + resizable (drag handle)
- [x] No console errors, no broken TypeScript types

## Implementation Plan

- [x] Create `src/hooks/useChartData.ts` — manages interval, chart type, indicator state
- [x] Update `binanceService.ts` — map interval labels to Binance interval strings
- [x] Rewrite `src/components/MainChart.tsx` — pro chart with all features
- [x] Create `src/components/LeftSidebar.tsx` — full sidebar with all sections
- [x] Update `src/app/page.tsx` — integrate LeftSidebar, remove old header dropdown
- [x] Update `MarketContext` if needed

## Files Changed

- `src/hooks/useChartData.ts` (created)
- `src/components/MainChart.tsx` (rewritten)
- `src/components/LeftSidebar.tsx` (created)
- `src/app/page.tsx` (updated)
- `src/services/binanceService.ts` (updated)

## Notes

- Recharts `ComposedChart` supports both Bar (for candlestick OHLC) and Line on same chart
- True candlestick in Recharts requires a custom shape — implement with rect + wick lines
- Resize: use `onMouseDown` drag on a handle div, track `mousemove` on `document`
- Keep polling intervals from AGENT_RULES: chart ≥ 5s
