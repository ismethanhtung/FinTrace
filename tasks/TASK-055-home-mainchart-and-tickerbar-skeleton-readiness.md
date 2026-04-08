# TASK-055: Home MainChart + TickerBar Skeleton Readiness on Reload

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Bugfix  
**Created:** 2026-04-07  
**Updated:** 2026-04-07  
**Assignee:** AI Agent

## Scope

- Fix thiếu skeleton ở header stats của `MainChart` (dòng `24h` và `Tags`).
- Bổ sung skeleton cho dòng `1H` (OHLCV) cùng behavior với `24h`.
- Fix `TickerBar` bị biến mất sau reload do `return null` khi `assets` chưa có.
- Đảm bảo bottom bar luôn sẵn sàng: chưa có data thì render skeleton fallback thay vì unmount.
- Fix warning/hydration mismatch ở `layout` và `TickerStatusBadge`.

## Acceptance

- [x] Header stats `MainChart` luôn render dòng `24h` và `Tags` theo trạng thái phù hợp.
- [x] Header stats `MainChart` dòng `1H` hiển thị skeleton khi chưa có candle data.
- [x] Khi chưa có `currentAsset`, `24h` row hiển thị skeleton placeholders.
- [x] Khi chưa có `currentAsset`, `Tags` row hiển thị skeleton placeholders.
- [x] `TickerBar` không còn `return null` khi `assets.length === 0`.
- [x] Reload trang chủ: vùng `TickerBar` luôn hiện ngay, trong lúc bootstrap dữ liệu hiển thị skeleton marquee.
- [x] `RootLayout` dùng `next/script` cho theme bootstrap, không còn warning script tag trong React component.
- [x] Tránh hydration mismatch cho trạng thái online/offline của `TickerStatusBadge`.
- [x] Typecheck pass.

## Files Changed

- `src/components/MainChart.tsx`
- `src/components/TickerBar.tsx`
- `src/app/layout.tsx`
- `tasks/TASK-055-home-mainchart-and-tickerbar-skeleton-readiness.md`
