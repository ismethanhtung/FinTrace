# TASK-004: Resizable Panes + Rich Stats Bar + Search Recents + Order Book Fix

**Status:** [x] Done  
**Priority:** High  
**Type:** Feature + Bugfix  
**Created:** 2026-03-23  
**Updated:** 2026-03-23  
**Assignee:** AI Agent

## Context

User review of TASK-002/003 identified 4 improvements:
1. Bottom pane (OrderBook) and Right Panel (AI Analysis) need drag-to-resize
2. Quick search should show "Recently viewed" coins + popular coins when not typing
3. The O/H/L/C/Vol bar shows current-candle data only — need full 24h market stats like Binance (24h chg $, 24h chg %, 24h high, 24h low, volume in base + USDT)
4. Order book groupings of 100/1000 show too few rows — need to fetch more depth levels

## Acceptance Criteria

- [ ] Bottom pane is vertically resizable via drag handle at top edge
- [ ] Right panel is horizontally resizable via drag handle at left edge
- [ ] Quick search dropdown shows "Recent" section (last 5 viewed coins)
- [ ] Stats bar shows: Candle OHLC (row 1) + 24h market stats (row 2)
- [ ] 24h stats include: Chg $, Chg %, 24h High, 24h Low, Vol (base coin), Vol (USDT)
- [ ] Order book fetches limit=1000 from Binance depth for wider price coverage
- [ ] TypeScript clean

## Implementation Plan

- [x] `binanceService.ts` — add `baseVolume`, `quoteVolumeRaw` to Asset type
- [x] `AssetList.tsx` — add Recent section with localStorage tracking  
- [x] `MainChart.tsx` — expand stats bar with 24h market data second row
- [x] `useOrderBook.ts` — increase depth limit to 1000, remove display cap
- [x] `RightPanel.tsx` — add horizontal resize handle on left edge
- [x] `page.tsx` — add vertical resize handle for bottom pane

## Files Changed

- `src/services/binanceService.ts`
- `src/components/AssetList.tsx`
- `src/components/MainChart.tsx`
- `src/hooks/useOrderBook.ts`
- `src/components/RightPanel.tsx`
- `src/app/page.tsx`
