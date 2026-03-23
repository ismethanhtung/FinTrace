# TASK-016: Fix Hydration Error + Refine OrderBook 3-Column Layout

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Bugfix + UX  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

Sau khi chuyển `OrderBook` sang hiển thị đồng thời `Recent Trades | Order Book | Depth`, người dùng gặp:

1. **Recoverable hydration error** trong `RecentTrades` do dữ liệu khởi tạo dùng `Math.random()` / `Date`.
2. Bố cục 3 cột chưa cân đối, chưa “chắc tay” về thị giác và readability.

## Acceptance Criteria

- [x] Không còn hydration mismatch ở `src/components/OrderBook.tsx`
- [x] Initial render của `RecentTrades` deterministic giữa server/client
- [x] Layout 3 cột cân đối hơn: trades trái, order book giữa, depth phải
- [x] Header/controls gọn, không rối
- [x] Build TypeScript pass

## Implementation Plan

- [x] Step 1: Refactor `RecentTrades` để tránh random/time ở initial SSR render
- [x] Step 2: Tinh chỉnh tỷ lệ cột, spacing, và panel hierarchy trong `OrderBook`
- [x] Step 3: Build verify + đóng task

## Files Changed

- `src/components/OrderBook.tsx`
