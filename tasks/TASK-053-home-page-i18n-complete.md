# TASK-053: Complete I18n Rollout for Home Page (/)

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Feature  
**Created:** 2026-04-05  
**Updated:** 2026-04-05  
**Assignee:** AI Agent

## Context

Sau khi đã có i18n foundation (`vi/en`), cần hoàn thiện trang chính `/` trước khi chuyển sang các trang khác theo yêu cầu: toàn bộ shell và panel chính trên trang home phải dùng i18n, đồng thời tối ưu UI switch ngôn ngữ cho gọn và đồng nhất với nút theme.

## Acceptance Criteria

- [x] Locale switch không còn dạng khung `VI | EN`.
- [x] Locale switch nằm bên phải cạnh nút theme, style cùng ngôn ngữ thiết kế.
- [x] Trang chính `/` được migrate i18n cho các khối chính:
  - [x] TopBar / RightPanel tabs
  - [x] LeftSidebar (search/filter/market status/sort)
  - [x] MainChart (header controls + info text chính)
  - [x] OrderBook (trades/orderbook/depth labels/actions)
  - [x] TickerBar
  - [x] FlowPanel
  - [x] FuturesLiquidationPanel
- [x] Typecheck pass.

## Files Changed

- `src/components/shell/LocaleSwitch.tsx`
- `src/components/shell/AppTopBar.tsx`
- `src/components/LeftSidebar.tsx`
- `src/components/MainChart.tsx`
- `src/components/OrderBook.tsx`
- `src/components/RightPanel.tsx`
- `src/components/TickerBar.tsx`
- `src/components/FlowPanel.tsx`
- `src/components/FuturesLiquidationPanel.tsx`
- `src/i18n/messages/en.ts`
- `src/i18n/messages/vi.ts`
- `tasks/TASK-053-home-page-i18n-complete.md`

## Notes

- Đã ưu tiên hoàn thiện trọn trang home trước, chưa triển khai sang page khác.
- Một số text rất sâu trong metadata nội bộ có thể giữ nguyên ngữ cảnh kỹ thuật; có thể chuẩn hóa tiếp ở phase kế tiếp.
