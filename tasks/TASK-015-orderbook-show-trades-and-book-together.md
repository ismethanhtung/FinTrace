# TASK-015: Show Recent Trades + Order Book Together

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Refactor + UX  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

Người dùng yêu cầu hiển thị đồng thời cả `Recent Trades` và `Order Book` vì đủ không gian.
Yêu cầu vị trí rõ ràng: **Recent Trades bên trái**, `Order Book` ở giữa, và `Depth` bên phải.

## Acceptance Criteria

- [x] Không còn tab chuyển `Order Book` / `Recent Trades`
- [x] Cả 2 phần hiển thị đồng thời trong cùng panel
- [x] Bố cục 3 cột: `Recent Trades` (trái) | `Order Book` (giữa) | `Depth` (phải)
- [x] Grouping selector vẫn hoạt động bình thường cho `Order Book`
- [x] Build TypeScript thành công

## Implementation Plan

- [x] Step 1: Refactor `src/components/OrderBook.tsx` từ layout tab sang layout 3 cột
- [x] Step 2: Đưa `RecentTrades` cố định vào cột trái
- [x] Step 3: Giữ `Order Book` và `Depth` ở giữa/phải, dọn phần header controls
- [x] Step 4: Chạy `npm run build` xác minh

## Files Changed

- `src/components/OrderBook.tsx`

## Notes

- Tỉ lệ cột hiện tại: trades ~31%, orderbook linh hoạt, depth ~22% để giữ readability.
- Controls (grouping + action icons) giữ một hàng duy nhất để UI gọn và nhất quán.
