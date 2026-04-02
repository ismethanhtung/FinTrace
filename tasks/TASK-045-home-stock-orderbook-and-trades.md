# TASK-045: Home `/` Stock OrderBook + Depth + Market Trades (Real Data)

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Feature  
**Created:** 2026-04-03  
**Updated:** 2026-04-03  
**Assignee:** AI Agent

## Context

Trang chủ `/` trước đây chỉ có orderbook/trades chạy tốt cho `coin`; ở `stock` phần giữa/bên phải thường kẹt placeholder hoặc báo chưa hỗ trợ. Trong khi đó hệ thống đã có dữ liệu depth và intraday trade từ stock lambda.

Mục tiêu là đưa dữ liệu stock thật vào cả:
- panel **Order Book** (center),
- panel **Depth metrics** (right),
- panel **Market Trades** (left),
với UI/nhãn theo ngữ cảnh cổ phiếu thay vì giữ nguyên khuôn coin.

## Acceptance Criteria

- [x] `stockLambdaService` có API typed:
  - [x] `getStockDepth(symbol)` từ `cmd=price_depth`
  - [x] `getStockIntradayTrades(symbol)` từ `cmd=stock_intraday_data`
- [x] `useOrderBook` hỗ trợ `universe=stock` bằng polling + mapping depth vào model orderbook chung.
- [x] `useRecentTrades` hỗ trợ `universe=stock` bằng polling intraday trades.
- [x] `OrderBook` UI hiển thị phù hợp stock (label/đơn vị VND + volume), không phụ thuộc assumptions Binance WS.
- [x] Không làm regress nhánh coin spot/futures.
- [x] Có test parser cho depth/trades stock.

## Implementation Plan

- [x] Bổ sung parser resilient cho payload khóa tiếng Việt/biến thể key.
- [x] Cắm luồng stock vào hooks hiện tại, giữ interface trả về tương thích component.
- [x] Tinh chỉnh UI tại `OrderBook.tsx` cho ngữ nghĩa stock.
- [x] Thêm unit test parser.
- [x] Chạy lint/test liên quan.

## Files Changed

- `src/services/stockLambdaService.ts`
- `src/services/stockLambdaService.test.ts`
- `src/hooks/useOrderBook.ts`
- `src/hooks/useRecentTrades.ts`
- `src/components/OrderBook.tsx`
- `tasks/TASK-045-home-stock-orderbook-and-trades.md`

## Notes

- Parser depth ưu tiên map theo level key (`Giá mua 1`, `KL mua 1`, …), có fallback từ cấu trúc mảng (`bid/offer`).
- Trades stock dùng polling do không có stream trade public chuẩn giống Binance trong code path hiện tại.
