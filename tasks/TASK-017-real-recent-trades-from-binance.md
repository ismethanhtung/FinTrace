# TASK-017: Replace Mock Recent Trades with Real Binance Data

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Feature + Bugfix  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

`Recent Trades` hiện tại đang là dữ liệu giả (`Math.random()`), không phù hợp với yêu cầu trading view thực tế.
Người dùng yêu cầu lấy dữ liệu thật ngay.

## Acceptance Criteria

- [x] `Recent Trades` hiển thị dữ liệu thật từ Binance
- [x] Spot mode dùng Spot endpoint
- [x] Futures mode dùng Futures endpoint
- [x] Không còn mock random trades trong `OrderBook.tsx`
- [x] Có loading/error state tối thiểu cho trades
- [x] Build pass

## Implementation Plan

- [x] Step 1: Mở rộng service với recent trades API cho spot/futures
- [x] Step 2: Tạo hook `useRecentTrades`
- [x] Step 3: Refactor `RecentTrades` component dùng hook thay mock data
- [x] Step 4: Build verify + update task

## Files Changed

- `src/services/binanceService.ts`
- `src/hooks/useRecentTrades.ts` *(new)*
- `src/components/OrderBook.tsx`
