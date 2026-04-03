# TASK-048: TickerBar Stability + Performance (No Rewind on Theme Switch)

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Stability / Performance  
**Created:** 2026-04-04  
**Updated:** 2026-04-04  
**Assignee:** AI Agent

## Context

TickerBar bị hiện tượng giật/lùi khi đổi theme và có dấu hiệu nặng khi stream cập nhật liên tục.
Nguyên nhân chính:
- Rule chống flicker theme đã vô hiệu animation toàn cục trong thời gian ngắn, làm marquee reset.
- TickerBar re-render nhiều phần không cần thiết (status đồng hồ mỗi giây kéo theo cả marquee).
- Danh sách key của marquee chưa tối ưu cho tính ổn định khi cập nhật.

## Acceptance Criteria

- [x] Đổi theme không còn làm ticker marquee giật lùi/reset vị trí.
- [x] TickerBar giảm re-render không cần thiết trong runtime.
- [x] Giữ thứ tự ticker ổn định khi có websocket ticks.
- [x] Giảm tải DOM render của ticker để nhẹ hơn.

## Files Changed

- `src/app/globals.css`
- `src/components/TickerBar.tsx`
- `tasks/TASK-048-tickerbar-stability-and-performance-theme-switch.md`

## Notes

- Gỡ phần `animation-duration: 0` trong chế độ `theme-switching`.
- Tách `TickerStatusBadge` ra khỏi marquee để timer 1s không kéo re-render toàn bar.
- Giới hạn danh sách ticker render tối đa `96` assets (2 lượt chạy = 192 nodes).
- Chỉ cập nhật `stableOrderIds` khi thứ tự thực sự thay đổi.

