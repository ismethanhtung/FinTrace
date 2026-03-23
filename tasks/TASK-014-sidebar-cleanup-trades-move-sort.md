# TASK-014: Sidebar Cleanup — Move Trades, Bỏ Movers, Sort 24h%

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Refactor + Feature  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

Người dùng yêu cầu:
1. **Bỏ tab "Movers"** khỏi LeftSidebar, nhưng giữ tính năng bằng cách thêm sort 24h% vào cột "Price / 24h".
2. **Bỏ tab "Trades"** khỏi LeftSidebar, chuyển `RecentTrades` vào tab "Recent Trades" của OrderBook (thay cho placeholder "coming soon").
3. Kết quả: LeftSidebar chỉ còn coin list (không cần tab nav nữa).

## Acceptance Criteria

- [x] LeftSidebar không còn section nav (tabs Coins / Movers / Trades)
- [x] Column header "Price / 24h" có thể click để sort: volume → 24h% giảm → 24h% tăng
- [x] `TopMovers`, `RecentTrades`, `generateTrades`, `TradeRow`, `formatPctSigned`, `EPS` đã được xóa khỏi LeftSidebar
- [x] Imports không cần thiết (`Flame`, `Activity`, `Clock`, `TrendingUp`, `TrendingDown`) xóa sạch
- [x] OrderBook "Recent Trades" tab hiển thị trades thực (từ code của LeftSidebar cũ)
- [x] Build TypeScript không có lỗi

## Implementation Plan

- [x] Step 1: Tạo task file này
- [x] Step 2: Dọn LeftSidebar (xóa TopMovers, RecentTrades, section nav, thêm sort)
- [x] Step 3: Cập nhật OrderBook (thêm RecentTrades vào tab)

## Files Changed

- `src/components/LeftSidebar.tsx`
- `src/components/OrderBook.tsx`
