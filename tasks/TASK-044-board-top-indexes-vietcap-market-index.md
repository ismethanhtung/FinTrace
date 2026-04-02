# TASK-044: Implement Board Top Indexes via Vietcap Market Index API

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature (Data Integration)  
**Created:** 2026-04-02  
**Updated:** 2026-04-02  
**Assignee:** AI Agent

## Context

User yêu cầu triển khai cụm 5 bảng phía trên của trang `/board` theo cùng quy trình như phần bảng dưới:

- Tách lớp rõ ràng: API proxy -> mapper -> service/hook -> UI.
- Dùng nguồn Vietcap API:
  - `POST https://trading.vietcap.com.vn/api/price/marketIndex/getList`
  - body symbols: `VNINDEX`, `VN30`, `HNXIndex`, `HNX30`, `HNXUpcomIndex`, `VNXALL`
- Giữ kiến trúc dễ bảo trì và có thể thay đổi nguồn sau này.

## Acceptance Criteria

- [x] Top index widgets và bảng index summary trên `/board` lấy dữ liệu từ Vietcap `marketIndex/getList`.
- [x] Hỗ trợ đầy đủ 6 index hiển thị: `VNINDEX`, `VN30`, `HNX30`, `VNXALL`, `HNXINDEX`, `UPCOM`.
- [x] Có API proxy nội bộ để tránh CORS + kiểm soát timeout/lỗi.
- [x] Có mapping layer normalize symbol/payload.
- [x] Không làm thay đổi nguồn dữ liệu leftbar/global.
- [x] Typecheck pass.

## Implementation Plan

- [x] Tạo route proxy `src/app/api/board/vietcap-market-index/route.ts`.
- [x] Tạo mapper `src/lib/vietcap/marketIndex.ts`.
- [x] Tạo service `src/services/vietcapMarketIndexService.ts`.
- [x] Tạo hook `src/hooks/useVietcapMarketIndexes.ts`.
- [x] Cập nhật `/board` để dùng hook mới cho `indexRows`/`indexByName`.
- [x] Tạo test mapper `src/lib/vietcap/marketIndex.test.ts`.

## Files Changed

- `tasks/TASK-044-board-top-indexes-vietcap-market-index.md`
- `src/app/api/board/vietcap-market-index/route.ts`
- `src/lib/vietcap/marketIndex.ts`
- `src/lib/vietcap/marketIndex.test.ts`
- `src/services/vietcapMarketIndexService.ts`
- `src/hooks/useVietcapMarketIndexes.ts`
- `src/app/board/page.tsx`

## Notes

- Symbol aliases được normalize để map về key UI hiện tại:
  - `HNXINDEX` <= `HNXINDEX` | `HNXIndex`
  - `UPCOM` <= `HNXUPCOMINDEX` | `HNXUpcomIndex` | `UPCOM`
- Nếu API tạm lỗi, UI giữ shape dữ liệu và fallback giá trị 0 như trước để không vỡ layout.

