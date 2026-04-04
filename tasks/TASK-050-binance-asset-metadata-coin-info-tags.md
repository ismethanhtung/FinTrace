# TASK-050: Binance Asset Metadata for Coin Info Icon + Tag Filter + Chart Tags

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-04-05  
**Updated:** 2026-04-05  
**Assignee:** AI Agent

## Context

User yêu cầu dùng API Binance asset catalog:

`https://www.binance.com/bapi/asset/v2/public/asset/asset/get-all-asset`

Mục tiêu trước mắt:

1. Thêm icon `i` giống stock cho từng coin trong leftbar.
2. Search/filter coin có bộ lọc theo `tags`.
3. Hiển thị `tags` gần chart stats, ở dòng thứ 3 sau `1H` và `24h`.

## Acceptance Criteria

- [x] Có route nội bộ để fetch Binance asset catalog và normalize payload.
- [x] Coin assets (`spot` + `futures`) được enrich với `tags` và metadata.
- [x] Leftbar coin row hiển thị icon `i` + tooltip info khi có metadata.
- [x] Leftbar coin search/filter hỗ trợ lọc theo `tags`.
- [x] Chart header hiển thị dòng `Tags` sau `1H` và `24h`.
- [x] Có docs kỹ thuật cho luồng metadata mới.
- [x] Typecheck pass.

## Implementation Plan

- [x] Tạo `GET /api/binance/assets` với server cache/revalidate 6h.
- [x] Tạo `binanceAssetMetadataService` (memory + localStorage cache 6h).
- [x] Mở rộng `Asset` model để chứa `tags` + `binanceAssetInfo`.
- [x] Integrate enrichment vào `coinMarketAdapter`.
- [x] Cập nhật `LeftSidebar` cho:
  - icon info coin
  - search match theo tags
  - filter popup tags
- [x] Cập nhật `MainChart` để render row `Tags` trên header stats.
- [x] Viết test cho service metadata.

## Files Changed

- `tasks/TASK-050-binance-asset-metadata-coin-info-tags.md`
- `docs/API.md`
- `docs/binance-asset-metadata.md`
- `src/app/api/binance/assets/route.ts`
- `src/services/binanceAssetMetadataService.ts`
- `src/services/binanceAssetMetadataService.test.ts`
- `src/services/binanceService.ts`
- `src/services/adapters/coinMarketAdapter.ts`
- `src/components/LeftSidebar.tsx`
- `src/components/MainChart.tsx`

