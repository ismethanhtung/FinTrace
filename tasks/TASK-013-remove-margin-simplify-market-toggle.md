# TASK-013: Remove Margin, Simplify Market Toggle UI

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Refactor  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

TASK-012 đã thêm Spot / Futures / Margin. Theo feedback người dùng:
1. Bỏ hoàn toàn **Margin** — code, API route, UI, type.
2. Bỏ bộ chuyển đổi tab **SPOT / PERP / MARGIN** trong sidebar.
3. Thay bằng: status bar hiện tại ("USD-M Perpetual · Binance Futures / 50 pairs") **thêm nút mũi tên quay tròn (↻)** để toggle giữa Spot ↔ Futures.

## Acceptance Criteria

- [x] Xóa `/api/margin-data/route.ts`
- [x] `MarketType` chỉ còn `'spot' | 'futures'`
- [x] Không còn `marginPairs`, `MarginPairInfo`, `fetchMarginPairs` trong code
- [x] `MarketTypeSwitcher` component bị xóa
- [x] `MarketStatusBar` tích hợp nút toggle ↻ vào cùng 1 dòng
- [x] Nhấn ↻ chuyển Spot → Futures → Spot (toggle)
- [x] Margin badge, margin explanation panel trong `CoinInfoPanel` bị xóa
- [x] Không còn import `Layers` hay code liên quan margin
- [x] Build không có TypeScript error

## Implementation Plan

- [x] Step 1: Tạo task file này
- [x] Step 2: Xóa `src/app/api/margin-data/route.ts`
- [x] Step 3: Cập nhật `src/services/binanceService.ts` — `MarketType = 'spot' | 'futures'`
- [x] Step 4: Cập nhật `src/context/MarketContext.tsx` — bỏ margin state
- [x] Step 5: Cập nhật `src/components/LeftSidebar.tsx` — xóa switcher, thêm toggle button vào status bar
- [x] Step 6: Cập nhật `src/components/MainChart.tsx` — xóa margin UI

## Files Changed

- `src/services/binanceService.ts`
- `src/context/MarketContext.tsx`
- `src/components/LeftSidebar.tsx`
- `src/components/MainChart.tsx`
- `src/app/api/margin-data/route.ts` *(deleted)*

## Notes

- `useChartData.ts` và `useOrderBook.ts` giữ nguyên — `MarketType` param vẫn hợp lệ sau khi bỏ 'margin'
- `useFuturesPremiumIndex.ts` giữ nguyên — không liên quan margin
- Toggle button dùng icon `RefreshCw` (2 mũi tên quay tròn) từ lucide-react
