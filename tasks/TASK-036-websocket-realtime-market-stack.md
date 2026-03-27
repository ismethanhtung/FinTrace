# TASK-036: WebSocket-First Realtime Market Stack

**Status:** [x] Done  
**Priority:** High  
**Type:** Feature + Refactor  
**Created:** 2026-03-28  
**Updated:** 2026-03-28  
**Assignee:** AI Agent / GPT-5.4  

## Summary

Replace the polling-based market data flow with a shared Binance websocket layer. REST remains only for bootstrap, hard resync, and data that Binance streams do not fully provide. The goal is realtime updates across:

- market coin list / left sidebar
- ticker bar
- chart
- recent trades
- order book
- futures coin info / funding
- market table rows

## Key Changes

1. Add a shared websocket service that owns reconnect, unsubscribe, backoff, and payload normalization.
2. Convert `MarketContext` into the live source of truth for spot and futures assets using Binance `!miniTicker@arr`.
3. Replace polling hooks with websocket-first hooks for:
   - recent trades
   - order book snapshot + diff-depth reconciliation
   - chart klines
   - futures premium index / mark price
   - transactions tape
4. Keep the existing layouts, but surface live / syncing / reconnecting / error states in the UI.
5. Keep REST bootstrap for initial list/snapshot data and hard resync on stream gaps.

## Public API / Interface Changes

- Existing hook shapes were preserved where practical.
- Added stream-aware metadata where useful:
  - `connectionStatus`
  - `lastUpdatedAt`
  - `refetch()`
  - `reconnect()`
- Market list and left sidebar now reflect websocket-driven price and 24h change updates in realtime.

## Test Plan

- Unit test stream normalization and merge logic.
- Validate order book snapshot + diff sequence handling.
- Verify websocket-backed hooks continue to return stable data shapes.
- Run full `vitest` and `tsc --noEmit`.

## Implementation Notes

- Browser WebSocket connections are used directly against Binance public market streams.
- Spot and futures are handled separately so each market type has its own live socket lifecycle.
- Order book resync is triggered automatically when sequence gaps are detected.

## Files Changed

- `src/services/marketStreamService.ts`
- `src/context/MarketContext.tsx`
- `src/hooks/useRecentTrades.ts`
- `src/hooks/useTransactions.ts`
- `src/hooks/useOrderBook.ts`
- `src/hooks/useChartData.ts`
- `src/hooks/useFuturesPremiumIndex.ts`
- `src/components/OrderBook.tsx`
- `src/components/LeftSidebar.tsx`
- `src/components/TickerBar.tsx`
- `src/services/marketStreamService.test.ts`

