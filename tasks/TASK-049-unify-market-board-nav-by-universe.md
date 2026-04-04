# TASK-049: Unify Topbar Market/Board Slot by Universe (Coin -> Market, Stock -> Board)

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** UX Refactor + Navigation  
**Created:** 2026-04-05  
**Updated:** 2026-04-06  
**Assignee:** AI Agent

## Context

Hiện tại topbar có cả `Markets` và `Board` cùng lúc, nhưng chất lượng theo universe lệch nhau:

- `coin`: trang `/market` tốt, `/board` không có giá trị thực tế.
- `stock`: trang `/board` tốt, `/market` không phù hợp nhu cầu.

Mục tiêu là hợp nhất thành **một vị trí điều hướng dùng chung** trong topbar:

- Universe `coin`: hiển thị `Market` (trỏ `/market`)
- Universe `stock`: hiển thị `Board` (trỏ `/board`)

Yêu cầu trọng tâm: triển khai gọn, sạch, tránh if-else rải rác, tránh duplicated nav logic.

## Product Decisions

- Topbar chỉ giữ **1 entry chung** ở vị trí cũ của cụm `Markets/Board`.
- Không hiển thị đồng thời cả `Markets` và `Board`.
- Khi đổi universe bằng `WorldSwitch`, entry chung tự đổi label + route tương ứng.
- Route không phù hợp universe sẽ chuyển hướng sang route phù hợp:
- `coin` vào `/board` -> chuyển sang `/market`
- `stock` vào `/market` -> chuyển sang `/board`

## Acceptance Criteria

- [x] Topbar chỉ có 1 slot điều hướng cho nhóm `Market/Board` (không còn 2 item song song).
- [x] Universe `coin` thấy item `Market`; click mở `/market`.
- [x] Universe `stock` thấy item `Board`; click mở `/board`.
- [x] Slot này nằm đúng vị trí cũ trong topbar, không làm xô lệch bố cục.
- [x] Active state đúng cho item chung theo route hiện tại.
- [x] Khi đang ở item chung và user switch universe:
- [x] `coin` -> `stock`: điều hướng sang `/board`.
- [x] `stock` -> `coin`: điều hướng sang `/market`.
- [x] Direct URL guard hoạt động:
- [x] `/board` với `coin` tự chuyển `/market`.
- [x] `/market` với `stock` tự chuyển `/board`.
- [x] Không ảnh hưởng nav item khác (`Chart`, `Heatmap`, `Data Streams`, `Transactions`, `News`).
- [x] Typecheck pass, không lỗi runtime/hydration.

## Implementation Plan

- [x] Tạo helper route-level để chuẩn hóa mapping universe -> entry chung:
- [x] `coin` -> `{ href: "/market", label: "Market" }`
- [x] `stock` -> `{ href: "/board", label: "Board" }`
- [x] Refactor `AppTopBar` để dựng nav item chung từ helper thay vì hard-code cả hai item.
- [x] Chuẩn hóa active matcher cho entry chung (`/market` hoặc `/board` tùy universe).
- [x] Thêm guard trong page layer:
- [x] `src/app/market/page.tsx`: nếu `universe === "stock"` thì redirect/replace sang `/board`.
- [x] `src/app/board/page.tsx`: nếu `universe === "coin"` thì redirect/replace sang `/market`.
- [x] Rà `resolveUniverseSwitchPath` để đảm bảo switch universe ở route chung luôn đi đúng đích.
- [x] Chạy `npm run -s typecheck`.

## Technical Notes

- Ưu tiên gom logic vào 1 chỗ (lib helper) để tránh lặp điều kiện ở nhiều component.
- Dùng `router.replace` cho redirect guard để không làm bẩn lịch sử điều hướng.
- Không đổi slug route hiện tại để tránh phá deep links; chỉ đổi khả năng truy cập theo universe.

## Files Expected To Change

- `tasks/TASK-049-unify-market-board-nav-by-universe.md` (new)
- `src/components/shell/AppTopBar.tsx`
- `src/lib/marketUniverse.ts` (hoặc file helper mới cho nav mapping)
- `src/lib/marketUniverse.test.ts`
- `src/app/market/page.tsx`
- `src/app/board/page.tsx`
- `src/context/UniverseContext.tsx` (nếu cần cập nhật route switch behavior)

## Test Checklist

- [x] Coin mode: topbar có `Market`, không có `Board`.
- [x] Stock mode: topbar có `Board`, không có `Market`.
- [x] Switch coin -> stock khi đang ở `/market` dẫn sang `/board`.
- [x] Switch stock -> coin khi đang ở `/board` dẫn sang `/market`.
- [x] Gõ URL `/board` trong coin mode bị chuyển `/market`.
- [x] Gõ URL `/market` trong stock mode bị chuyển `/board`.
- [x] Các page khác vẫn render topbar/nav bình thường.
- [x] `npm run -s typecheck` pass.

## Validation

- `npm run -s typecheck`: pass
- `npm run -s test -- src/lib/marketUniverse.test.ts`: pass (3/3)

## Out of Scope

- Gộp nội dung data của `/market` và `/board` vào cùng một trang.
- Đổi lại IA tổng thể của toàn bộ menu topbar ngoài slot chung này.
- Tinh chỉnh sâu UI bảng market/board (chỉ xử lý điều hướng và khả dụng theo universe).
