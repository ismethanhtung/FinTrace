# TASK-024: Hoàn thiện sort cho sub-tabs Market (Top/Trending/New/Most Visited/Gainers/More)

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature + Refactor  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

Yêu cầu mở rộng logic sort/filter cho hàng sub-tabs trên `/market` gồm:
- `Top`
- `Trending`
- `New`
- `Most Visited`
- `Gainers`
- `More`

Hiện tại UI đã có sub-tabs nhưng chưa gắn đầy đủ hành vi dữ liệu theo từng tab.  
Mục tiêu là làm giống tinh thần phần đã triển khai ở trang chính/left sidebar: thao tác nhanh, rõ thứ tự sort, không phá layout hiện có.

Ràng buộc kỹ thuật cần tuân thủ:
- Theo `AGENT_RULES`: giữ kiến trúc lớp (UI -> hooks/context -> services -> external APIs), không fetch trực tiếp bừa bãi trong component.
- Giữ blast radius nhỏ: ưu tiên tái sử dụng `useMarketPageData`, `marketPageApi`, và util `marketNetwork`.
- Giữ nguyên giao diện hiện tại, chỉ thay đổi wiring logic cho dữ liệu.

## Acceptance Criteria

- [x] `Top` hoạt động với thứ tự mặc định ổn định và nhất quán (ưu tiên theo metric thị trường chính, không random).
- [x] `Gainers` sort giảm dần theo `24h %` (coin tăng mạnh đứng đầu).
- [x] `Trending`, `New`, `Most Visited` có hành vi dữ liệu rõ ràng, deterministic, và có fallback nếu nguồn ngoài lỗi.
- [x] `More` có hành vi có chủ đích (dropdown hoặc nhóm sort mở rộng), không chỉ là nút trang trí.
- [x] Chuyển tab không làm mất search/network filter/pagination semantics (reset trang hợp lý, không race condition).
- [x] Không thay đổi layout/styling chính của `src/app/market/page.tsx`.
- [x] Logic sort được tách thành util/hook để tránh nhồi business logic vào JSX.
- [x] Có test tối thiểu cho mapping tab -> sort strategy và các comparator chính.
- [x] TypeScript và lint cho các file sửa phải pass.

## Functional Spec (định nghĩa hành vi tab)

- [x] `Top`: sort theo `24h Volume` giảm dần, tie-break theo biến động rồi symbol.
- [x] `Gainers`: sort theo `24h %` giảm dần.
- [x] `New`: dùng fallback deterministic (ưu tiên volume thấp hơn + activity ngắn hạn), có document rõ.
- [x] `Trending`: dùng score nội bộ deterministic từ volume + biến động (`h24`, `h1`, `d7`).
- [x] `Most Visited`: dùng proxy metric deterministic từ volume + biến động 24h.
- [x] `More`: mở rộng 3 lựa chọn hữu ích (`Highest Volume`, `Losers`, `Most Volatile`) và có active state rõ.

## Implementation Plan

- [x] Step 1: Chuẩn hóa enum/tab key và strategy map cho sub-tabs (tránh hardcode string rải rác).
- [x] Step 2: Tách comparator/sort pipeline thành util thuần (testable), giữ sort stable.
- [x] Step 3: Chọn hướng fallback deterministic nội bộ cho `Trending/New/Most Visited` trong scope nhanh, không thêm external endpoint mới.
- [x] Step 4: Wiring tab state vào pipeline `rows -> filtered -> sorted -> paged` trong `market/page.tsx`.
- [x] Step 5: Cập nhật `More` thành action thực (menu/selector strategy) thay vì placeholder.
- [x] Step 6: Viết test cho strategy mapping/comparator chính.
- [x] Step 7: Chạy validate (TypeScript/lint/tests), cập nhật task và checklist.

## Files Changed

- `src/app/market/page.tsx`
- `src/hooks/useMarketPageData.ts`
- `src/lib/marketSort.ts` *(new)*
- `src/lib/marketSort.test.ts` *(new)*
- `tasks/TASK-024-market-page-subtab-sorts-top-trending-new-most-visited-gainers-more.md`

## Validation Plan

- [x] `npx tsc --noEmit`
- [x] `ReadLints` cho các file vừa sửa: không có lỗi
- [x] Chạy test file mới cho sort strategies/comparators (`node --import tsx --test src/lib/marketSort.test.ts`)
- [x] Manual verify:
  - [x] Mỗi tab cho thứ tự đúng theo spec fallback hiện tại
  - [x] Search + network chips + pagination vẫn đúng khi đổi tab
  - [x] Spot/Futures đều hoạt động cùng logic tab sort

## Notes / Risks

- `Trending`, `New`, `Most Visited` phụ thuộc định nghĩa metric và/hoặc nguồn dữ liệu ngoài; cần chốt rõ source để tránh hành vi "giả lập".
- Nếu provider không ổn định (rate-limit/timeout), bắt buộc có fallback deterministic để UI không trống.
- Scope hiện tại chủ đích chưa thêm external endpoint mới cho `Trending/New/Most Visited`; dùng internal proxy score để đảm bảo tốc độ triển khai và tính ổn định.
