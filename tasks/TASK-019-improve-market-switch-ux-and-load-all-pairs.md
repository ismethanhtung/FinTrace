# TASK-019: Improve Market Switch UX and Load All USDT Pairs

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** UX + Feature  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

User feedback:
1. Thanh `Spot Market · Binance / 50 pairs` chưa đủ rõ ràng về thao tác chuyển sang Futures.
2. Chỉ lấy 50 cặp là thiếu — cần lấy toàn bộ cặp USDT (spot/futures) từ Binance.

## Acceptance Criteria

- [x] Spot/Futures switch rõ ràng, dễ nhận biết có thể nhấn để đổi market
- [x] UI hiển thị trạng thái hiện tại + trạng thái mục tiêu (sẽ chuyển sang đâu)
- [x] Spot assets load toàn bộ USDT pairs (không slice 50)
- [x] Futures assets load toàn bộ USDT perpetual pairs (không slice 50)
- [x] Số `pairs` hiển thị đúng theo dữ liệu thực
- [x] Build pass

## Implementation Plan

- [x] Update `src/context/MarketContext.tsx` remove top-50 slicing
- [x] Update `src/components/LeftSidebar.tsx` redesign MarketBar CTA
- [x] Build verify + close task

## Files Changed

- `src/context/MarketContext.tsx`
- `src/components/LeftSidebar.tsx`
