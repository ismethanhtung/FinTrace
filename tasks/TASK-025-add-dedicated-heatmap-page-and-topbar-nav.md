# TASK-025: Add Dedicated Heatmap Page and Topbar Navigation

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

Người dùng yêu cầu dùng lại heatmap nhưng không nhúng vào các trang hiện tại.  
Cần tạo một trang riêng cho heatmap, thêm entry trong topbar để truy cập nhanh, và giữ bottom bar chạy như trang chính.

## Acceptance Criteria

- [x] Có route mới `/heatmap`.
- [x] Trang `/heatmap` hiển thị heatmap chiếm khoảng 90% vùng hiển thị chính.
- [x] Trang `/heatmap` có bottom `TickerBar` chạy giống trang chính.
- [x] Topbar có điều hướng đến Heatmap.
- [x] Không nhúng heatmap vào các trang hiện có.
- [x] Lint pass cho các file đã chỉnh sửa.

## Implementation Plan

- [x] Step 1: Tạo task file.
- [x] Step 2: Tạo trang mới `src/app/heatmap/page.tsx` với layout yêu cầu.
- [x] Step 3: Thêm link Heatmap trên topbar các trang chính.
- [x] Step 4: Chạy lint/check, cập nhật checklist và đánh dấu task done.

## Files Changed

- `tasks/TASK-025-add-dedicated-heatmap-page-and-topbar-nav.md`
- `src/app/heatmap/page.tsx`
- `src/app/page.tsx`
- `src/app/market/page.tsx`

## Notes

- Reuse component `src/components/MarketHeatmap.tsx`.
- Reuse `src/components/TickerBar.tsx` để đồng bộ behavior với trang chính.
- `npm run lint` hiện không chạy được trong project do script `next lint` không tương thích (`Invalid project directory .../lint`), nên dùng `ReadLints` để kiểm tra file vừa sửa.
- `npm run test` pass (7/7).
