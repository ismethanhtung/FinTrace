# TASK-039: Integrate Stock Lambda for Listing + Light Chart

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-03-29  
**Updated:** 2026-03-29  
**Assignee:** AI Agent

## Context

Phase tiếp theo của world `stock` cần dữ liệu thật thay cho mock ở phạm vi tối thiểu: danh sách mã và chart nhẹ. Nguồn dữ liệu dùng Lambda URL do user cung cấp qua env, không hard-code endpoint.

## Acceptance Criteria

- [x] Không hard-code Lambda URL trong code, đọc từ env `NEXT_PUBLIC_STOCK_LAMBDA_URL`.
- [x] Stock assets ở `MarketContext` ưu tiên lấy từ Lambda (`listing_companies` + lịch sử ngắn để tính giá/chg/volume).
- [x] Chart stock trong `useChartData` ưu tiên gọi Lambda (`stock_historical_data`) theo interval đang chọn.
- [x] Có fallback về mock data nếu env thiếu hoặc Lambda lỗi để UI không crash.
- [x] Cập nhật `.env.example` và README để ghi nhận env mới.

## Implementation Plan

- [x] Tạo stock lambda service chuẩn hóa gọi API + mapper dữ liệu.
- [x] Tạo stock adapter mới dùng lambda service và fallback mock.
- [x] Thay `MarketContext` sang adapter mới cho universe stock.
- [x] Cập nhật `useChartData` để lấy chart thật từ Lambda cho stock.
- [x] Cập nhật docs env và chạy verify (test/typecheck).

## Files Changed

- `tasks/TASK-039-stock-lambda-list-and-light-chart.md`
- `src/services/stockLambdaService.ts`
- `src/services/adapters/stockLambdaMarketAdapter.ts`
- `src/context/MarketContext.tsx`
- `src/hooks/useChartData.ts`
- `.env.example`
- `README.md`
