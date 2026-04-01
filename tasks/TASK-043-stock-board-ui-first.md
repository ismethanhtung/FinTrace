# TASK-043: Build Stock Board UI-First Page (`/board`)

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature (UI)  
**Created:** 2026-04-01  
**Updated:** 2026-04-01  
**Assignee:** AI Agent

## Context

User yêu cầu tạo một trang board giao diện chuẩn, tham khảo layout bảng điện đã cung cấp, ưu tiên làm kỹ phần UI trước. Scope hiện tại:

- Universe chính: `stock`
- Universe `coin`: tạm thời hiển thị `not available`
- Cần phù hợp với kiến trúc web hiện có (theme/light-dark, top bar, world switch)

## Acceptance Criteria

- [x] Có trang mới `/board` render giao diện board chứng khoán đầy đủ (top mini charts, thanh điều hướng, bảng điện nhiều cột, footer status).
- [x] Thiết kế bám sát mẫu tham khảo nhưng dùng theme variables của hệ thống (`bg-main`, `bg-secondary`, `border-main`, `text-main`, `text-muted`) để hỗ trợ light/dark mode.
- [x] Khi `universe !== stock`, trang hiển thị trạng thái `Board not available` cho coin.
- [x] Có hành động chuyển nhanh sang `stock` từ trạng thái không hỗ trợ.
- [x] Không phá vỡ trang hiện tại (`/market`, `/`, `/news`, ...).

## Implementation Plan

- [x] Tạo page client tại `src/app/board/page.tsx`.
- [x] Dựng mock types + mock stock/index data theo mẫu user gửi để hoàn thiện UI.
- [x] Build các block UI: mini chart cards, index sidebar, navigation/search/actions, stock table, footer.
- [x] Tích hợp `useUniverse` để khóa scope `stock` và fallback `coin`.
- [x] Tích hợp `useAppSettings` để hỗ trợ toggle theme tại board.
- [x] Chạy typecheck để đảm bảo không lỗi compile.

## Files Changed

- `tasks/TASK-043-stock-board-ui-first.md`
- `src/app/board/page.tsx`

## Notes

- Bản hiện tại là UI-first với data mock để chốt layout/UX trước khi đấu dữ liệu realtime.
- Sau khi duyệt UI có thể tạo task tiếp theo để nối API stock realtime và format số theo feed thật.
