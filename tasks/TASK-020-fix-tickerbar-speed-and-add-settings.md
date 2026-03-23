# TASK-020: Fix TickerBar Speed and Add Real Settings Panel

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Medium  
**Type:** Bugfix + Feature  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

Sau khi bỏ giới hạn 50 pairs và load toàn bộ danh sách coin (vài trăm cặp), thanh cuộn `TickerBar` ở dưới cùng chạy quá nhanh do thời gian animation (`120s`) bị cố định trong khi chiều dài nội dung tăng gấp nhiều lần. 
Đồng thời, người dùng yêu cầu thêm một nút "Settings" vào TickerBar với khung cấu hình thật để người dùng có thể chọn loại dữ liệu chạy ở bottom bar: `coin hot`, `coin lời`, và chừa sẵn `coin yêu thích` cho giai đoạn sau.

## Acceptance Criteria

- [ ] Tốc độ cuộn của TickerBar phải mượt mà và dễ đọc, tự động điều chỉnh tỷ lệ thuận với số lượng coin.
- [ ] Thêm nút Settings (icon) vào TickerBar.
- [ ] Khi nhấn vào Settings phải mở ra khung cấu hình nhỏ, không dùng alert/placeholder.
- [ ] Có thể chọn `Coin hot` và `Coin lời`, bottom bar đổi dữ liệu hiển thị ngay theo lựa chọn.
- [ ] Hiển thị mục `Coin yêu thích` ở trạng thái placeholder/soon để chuẩn bị cho bước sau.
- [ ] Build pass, không lỗi UI.

## Implementation Plan

- [ ] Step 1: Tính toán `animationDuration` động dựa trên `assets.length` trong `TickerBar.tsx`.
- [ ] Step 2: Thêm popover settings nhỏ trong `TickerBar.tsx`.
- [ ] Step 3: Kết nối lựa chọn hiển thị `Coin hot` / `Coin lời` với danh sách render của ticker.
- [ ] Step 4: Giữ `Coin yêu thích` ở trạng thái placeholder cho bước tiếp theo.
- [ ] Step 5: Build và verify.

## Files Changed

- `src/components/TickerBar.tsx`
