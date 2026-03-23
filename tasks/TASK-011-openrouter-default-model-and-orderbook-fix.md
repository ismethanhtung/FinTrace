# TASK-011: OpenRouter Default + Fix Orderbook Rows

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked
**Priority:** High
**Type:** Bugfix + Feature
**Created:** 2026-03-23
**Updated:** 2026-03-23
**Assignee:** AI Agent

## Context
1. UI AI đang báo lỗi “API Key Required” khi `openrouterApiKey` rỗng.
2. Order book khi chọn grouping `50 / 100 / 1000` chỉ hiển thị khoảng vài level (~4), trong khi các grouping khác thì hiển thị “khá đầy đủ”.

## Acceptance Criteria
1. AI chat không còn yêu cầu user phải tự nhập key để dùng thử (dùng fallback key mặc định + model mặc định `arcee-ai/trinity-large-preview:free`).
2. Order book:
   - Lấy depth từ Binance với `limit=1000` (không còn `500`).
   - Không bị “cắt” số lượng bucket sau khi gom (remove/raise cap trong `groupEntries`).
   - Tắt logic auto-reset `grouping` theo `suggestGrouping(price)` khi user đang thao tác chọn grouping (để grouping user chọn không bị reset).
3. Sau fix, grouping `50 / 100 / 1000` phải hiển thị nhiều level hơn đáng kể so với hiện tại.

## Implementation Plan
1. Update `src/context/AppSettingsContext.tsx`
   - Đặt `DEFAULT_MODEL` theo yêu cầu.
   - Thiết lập fallback `openrouterApiKey`.
   - Sửa logic rehydrate để cho phép người dùng “xóa key” (localStorage lưu `''`) vẫn được tôn trọng.
2. Update orderbook
   - `src/hooks/useOrderBook.ts`: đổi `binanceService.getDepth(symbol, 500)` -> `getDepth(symbol, 1000)`, và tăng/loại cap trong `groupEntries`.
   - `src/components/OrderBook.tsx`: thêm cờ “user đã chọn grouping” để ngăn auto-reset khi price tick update.
3. Verify
   - Kiểm tra UI: ChatPanel không còn banner “API Key Required” khi chưa nhập key.
   - Kiểm tra OrderBook: grouping 50/100/1000 có nhiều rows hơn.

## Files Changed
- `src/context/AppSettingsContext.tsx`
- `src/hooks/useOrderBook.ts`
- `src/components/OrderBook.tsx`

## Notes
- Lưu ý bảo mật: fallback key được request rõ ràng từ user. Nếu bạn muốn theo chuẩn bảo mật (key chỉ ở server), mình sẽ đề xuất phương án proxy qua route handler.

