# TASK-037: Add Futures Liquidation Stream Tab (`@forceOrder`)

**Status:** [x] Done  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-03-28  
**Updated:** 2026-03-28  
**Assignee:** AI Agent / GPT-5.4  

## Summary

Add a dedicated liquidation stream tab in the chart panel using Binance Futures `\<symbol\>@forceOrder`, and ensure futures-only tabs are hidden on Spot.

## Requirements

1. Add a 4th tab in `MainChart` for liquidation stream display.
2. Parse and render liquidation order details:
   - side (BUY/SELL)
   - order type / status
   - price
   - quantity
   - notional value (USD)
3. Keep `Flow` and `Liquidation` futures-only:
   - Futures: show `Chart`, `Coin Info`, `Flow`, `Liquidation`
   - Spot: show `Chart`, `Coin Info`
4. Keep fallback behavior safe when switching market type (no invalid active tab state).

## Implementation

- Added liquidation event type to shared stream types.
- Added `normalizeBinanceFuturesForceOrderEvent(...)`.
- Added `FuturesLiquidationPanel` with direct websocket connection:
  - `wss://fstream.binance.com/ws/<symbol>@forceOrder`
  - reconnect support + status indicator
  - newest-first tape rendering
- Updated `MainChart` tab logic to be market-aware and include the new tab.
- Added a guard in `FlowPanel` so it is futures-only.
- Added unit tests for force-order normalization and routing.

## Acceptance Checklist

- [x] Liquidation tab appears in futures market.
- [x] Liquidation tab does not appear in spot market.
- [x] Flow tab does not appear in spot market.
- [x] Liquidation records show side/type/price/qty/notional clearly.
- [x] Parser test covers `forceOrder` payload.
- [x] Existing trade/funding normalization behavior remains intact.

## Files Changed

- `src/lib/dataStream/types.ts`
- `src/services/dataStream/normalizeBinanceEvent.ts`
- `src/services/dataStream/normalizeBinanceEvent.test.ts`
- `src/components/FuturesLiquidationPanel.tsx`
- `src/components/MainChart.tsx`
- `src/components/FlowPanel.tsx`
