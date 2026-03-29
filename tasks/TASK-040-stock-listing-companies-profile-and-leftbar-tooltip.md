# TASK-040: Enrich Stock Profile from `listing_companies` + Leftbar Info Tooltip

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-03-30  
**Updated:** 2026-03-30  
**Assignee:** AI Agent

## Context

Dữ liệu `?cmd=listing_companies` chứa metadata rất giàu (sector/industry/group/subgroup, ICB, index membership như VN30/VN100/VNFIN...). Cần khai thác tối đa để:

1. Làm phần asset info của stock đầy đủ hơn, không chỉ giá/volume.
2. Thêm icon thông tin (`i`) ngay trên mỗi mã ở left sidebar để người dùng hover và xem nhanh profile doanh nghiệp.

## Acceptance Criteria

- [x] Chuẩn hóa thêm metadata từ `listing_companies` vào model asset stock.
- [x] `Asset info` trên chart panel hiển thị đầy đủ profile company cho stock:
  company name, short name, exchange, sector, industry, group/subgroup, ICB, ICB path, index memberships.
- [x] Left sidebar hiển thị icon info cạnh ticker cho stock; hover hiện tooltip gọn nhẹ.
- [x] Tooltip không phá layout row và chỉ hiển thị khi có metadata.
- [x] Typecheck pass.

## Implementation Plan

- [x] Mở rộng kiểu dữ liệu `Asset` để chứa `stockProfile`.
- [x] Nâng cấp mapper trong `stockLambdaService` để parse đầy đủ trường từ `listing_companies`.
- [x] Gắn `stockProfile` vào asset ở cả base list, snapshot path và fallback history path.
- [x] Cập nhật `MainChart` info panel để render thêm block thông tin doanh nghiệp.
- [x] Cập nhật `LeftSidebar` coin row với icon info + hover tooltip.
- [x] Chạy `npm run -s lint` (tsc --noEmit).

## Files Changed

- `tasks/TASK-040-stock-listing-companies-profile-and-leftbar-tooltip.md`
- `src/services/binanceService.ts`
- `src/services/stockLambdaService.ts`
- `src/components/MainChart.tsx`
- `src/components/LeftSidebar.tsx`
