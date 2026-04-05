# TASK-051: Wire Home Stock Depth to Board Snapshot + Realtime Pipeline

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Feature  
**Created:** 2026-04-05  
**Updated:** 2026-04-05  
**Assignee:** AI Agent

## Context

Trang chủ `/` ở stock universe hiện để `Soon` cho phần order book/depth, trong khi `/board` đã có pipeline dữ liệu chuẩn gồm Vietcap snapshot + DNSE realtime (socket/SSE). Cần đưa home stock depth chạy cùng pipeline với `/board` để dữ liệu đồng nhất và tự nhận realtime update khi stream có dữ liệu.

## Acceptance Criteria

- [x] `OrderBook` trên `/` khi universe `stock` không còn hiển thị `Soon`.
- [x] Stock depth ở `/` đọc cùng nguồn dữ liệu với `/board` (Vietcap snapshot + DNSE realtime overlay).
- [x] UI có bảng depth 3 mức giá và biểu đồ độ sâu đơn giản, dễ đọc.
- [x] Không ảnh hưởng hành vi order book/depth bên `coin`.
- [x] Có cập nhật docs mô tả luồng dữ liệu stock depth cho home.

## Implementation Plan

- [x] Đổi nhánh `stock` trong `useOrderBook` sang pipeline board (snapshot + realtime stream), bỏ polling `price_depth` cũ.
- [x] Thay `Soon` trong `OrderBook` bằng render dữ liệu stock depth thực tế.
- [x] Bổ sung UI cho stock depth panel: bảng 3 mức + mini depth chart.
- [x] Chạy typecheck/test tối thiểu cho phạm vi thay đổi.
- [x] Viết docs cho kiến trúc dữ liệu mới.

## Files Changed

- `src/hooks/useOrderBook.ts`
- `src/components/OrderBook.tsx`
- `docs/home-stock-depth-board-pipeline.md`
- `tasks/TASK-051-home-stock-depth-from-board-pipeline.md`

## Notes

- Giữ nguyên luồng coin (Binance snapshot + websocket depth + bookTicker).
- Stock dùng cùng nhóm snapshot như `/board`: `VN30`, `HNX30`, `HOSE`, `HNX`, `UPCOM`.
- Số lượng realtime DNSE nhân hệ số `10` để đồng nhất format volume với board hiện tại.
