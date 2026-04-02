# TASK-046: Stock `/transactions` from Matched Trades + OrderBook/Depth Soon Mode

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Feature / Stability  
**Created:** 2026-04-03  
**Updated:** 2026-04-03  
**Assignee:** AI Agent

## Context

`price_depth` cho stock không ổn định và có rủi ro áp lực backend. Yêu cầu hiện tại:
- Không dùng `price_depth` cho stock ở trang chủ `/`.
- Giữ layout giao diện 3 panel, nhưng panel OrderBook + Depth hiển thị trạng thái `Soon`.
- Giữ `Matched Trades` hoạt động.
- Dùng dữ liệu matched trades để hiện thực trang `/transactions` cho stock.

## Acceptance Criteria

- [x] Không còn gọi `price_depth` từ luồng stock orderbook hook.
- [x] Trang chủ `/` universe stock vẫn giữ khung UI 3 panel; 2 panel giữa/phải hiển thị `Soon`.
- [x] `View details` trong panel trades dẫn tới `/transactions`.
- [x] `/transactions` hỗ trợ stock bằng dữ liệu `stock_intraday_data`.
- [x] Label/format chính ở `/transactions` tương thích stock (`Price (VND)`, qty/notional hiển thị hợp lý).

## Files Changed

- `src/hooks/useOrderBook.ts`
- `src/components/OrderBook.tsx`
- `src/hooks/useTransactions.ts`
- `src/app/transactions/page.tsx`
- `tasks/TASK-046-stock-transactions-and-orderbook-soon-mode.md`

## Notes

- Polling stock transactions dùng chu kỳ tối thiểu 1.5s, mặc định 2s.
- Polling stock transactions dùng mode `silent` để tránh flicker loading mỗi chu kỳ.
