# TASK-038: Multi-World UI Foundation (Coin ↔ Stock) with Mock Stock Data

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-03-29  
**Updated:** 2026-03-29  
**Assignee:** AI Agent

## Context

FinTrace hiện vận hành theo thế giới `coin` (spot/futures). Mục tiêu phase này là mở rộng UI/UX để người dùng chuyển mượt giữa `coin` và `stock`, giữ layout/flow giống nhau nhưng tách dữ liệu hoàn toàn. Trong phase 1 chưa có nguồn stock thật nên dùng mock data có gắn cờ rõ ràng.

## Acceptance Criteria

- [x] Có universe-level context `coin | stock`, mặc định `coin`, persist localStorage.
- [x] Có world switch dùng chung ở top-level header cho các trang chính.
- [x] Chuyển world giữ route nếu route hỗ trợ, fallback về `/market` nếu không.
- [x] Thêm mock stock dataset deterministic và tách biệt hoàn toàn khỏi coin data.
- [x] Giữ tương thích ngược API hiện tại của `MarketContext`.
- [x] Thêm contract types cho mô hình unified/adapters để mở rộng nguồn stock thật sau này.
- [x] Refactor text phụ thuộc `coin` sang `asset` ở các điểm chung (search/ticker/sidebar).
- [x] Trang chính trong phạm vi rollout hoạt động khi world = `stock` mà không crash/hydration mismatch.
- [x] Có test cho universe persistence, route switch logic, stock mock adapter, mapper.
- [x] Cập nhật docs kiến trúc về universe layer + adapter pattern + hướng nối data thật.

## Implementation Plan

- [x] Tạo task file và chốt checklist.
- [x] Thêm universe types/context + route switch utility.
- [x] Thêm adapter interfaces + coin adapter + stock mock adapter + mapper.
- [x] Tích hợp universe vào `MarketContext` theo hướng không phá API cũ.
- [x] Tích hợp World Switch vào headers các trang chính.
- [x] Chuẩn hóa label `coin` -> `asset` cho các điểm dùng chung.
- [x] Bổ sung mock indicators/badges trên UI để người dùng nhận biết dữ liệu giả.
- [x] Viết unit/component tests cho phần mới.
- [x] Cập nhật docs kiến trúc và hướng mở rộng.
- [x] Chạy typecheck/tests, tự verify AC và đóng task.

## Files Changed

- `tasks/TASK-038-multi-world-ui-foundation-coin-stock-mock.md`
- `src/context/UniverseContext.tsx`
- `src/lib/marketUniverse.ts`
- `src/lib/mockStockData.ts`
- `src/services/marketDataAdapter.ts`
- `src/services/adapters/coinMarketAdapter.ts`
- `src/services/adapters/stockMockMarketAdapter.ts`
- `src/context/MarketContext.tsx`
- `src/components/shell/WorldSwitch.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/market/page.tsx`
- `src/app/heatmap/page.tsx`
- `src/app/data-stream/page.tsx`
- `src/app/smart-money/page.tsx`
- `src/app/liquidation/page.tsx`
- `src/components/news/NewsPageClient.tsx`
- `src/components/AssetList.tsx`
- `src/components/LeftSidebar.tsx`
- `src/components/TickerBar.tsx`
- `src/components/MainChart.tsx`
- `src/components/OrderBook.tsx`
- `src/components/MarketHeatmap.tsx`
- `src/components/SmartMoneyWhalePanel.tsx`
- `src/components/FuturesLiquidationPanel.tsx`
- `src/hooks/useChartData.ts`
- `src/hooks/useOrderBook.ts`
- `src/hooks/useRecentTrades.ts`
- `src/hooks/useTransactions.ts`
- `src/hooks/useDataStream.ts`
- `src/hooks/useFuturesPremiumIndex.ts`
- `src/hooks/useMarketPageData.ts`
- `src/services/binanceService.ts`
- `src/lib/marketUniverse.test.ts`
- `src/lib/mockStockData.test.ts`
- `src/services/marketDataAdapter.test.ts`
- `src/context/UniverseContext.test.tsx`
- `docs/ARCHITECTURE.md`
- `docs/universe-adapter-guide.md`
- `README.md`

## Notes

- Có thay đổi cục bộ sẵn từ trước ở `src/components/ai/ChatPanel.tsx` và một số file trang mới (`smart-money`, `liquidation`); task này không được revert các thay đổi đó.
- Stock phase 1 là mock-only, luôn hiển thị rõ trạng thái mock để tránh hiểu nhầm dữ liệu thật.
