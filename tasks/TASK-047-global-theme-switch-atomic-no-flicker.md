# TASK-047: Global Theme Switch Atomic (No Light/Dark Flicker)

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Stability / UX  
**Created:** 2026-04-04  
**Updated:** 2026-04-04  
**Assignee:** AI Agent

## Context

Khi đổi theme (ví dụ ở `/board`), UI xuất hiện frame trung gian "lộn xộn" do:
- state `theme` đổi ngay trong React render,
- nhưng `data-theme` trên `documentElement` được apply qua `useEffect` (sau paint),
- cộng thêm transition màu trên nhiều node làm quá trình chuyển không đồng bộ.

Yêu cầu là fix toàn hệ thống theo cơ chế chặt chẽ, không chỉ một trang.

## Acceptance Criteria

- [x] Theme được apply lên DOM theo cơ chế đồng bộ trước paint để tránh frame mismatch.
- [x] Khi user đổi theme, toàn app đổi theo một nhịp, không còn vùng sáng/tối lẫn nhau trong transition window.
- [x] Bootstrap lúc load trang giữ `data-theme` và `color-scheme` nhất quán từ đầu.
- [x] Có test unit cho utility apply theme DOM.

## Files Changed

- `src/lib/themeDom.ts`
- `src/lib/themeDom.test.ts`
- `src/context/AppSettingsContext.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `tasks/TASK-047-global-theme-switch-atomic-no-flicker.md`

## Notes

- Dùng class toàn cục `html.theme-switching` để tắt transition/animation trong một khoảng rất ngắn khi theme đổi.
- `color-scheme` được set đồng bộ theo theme (`light` hoặc `dark`) để đồng bộ control native/UI browser.

