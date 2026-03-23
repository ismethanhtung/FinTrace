# TASK-012: Add Futures & Margin Market Data

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-03-24  
**Updated:** 2026-03-24 ✓ Done  
**Assignee:** AI Agent

## Context

Hiện tại FinTrace chỉ hiển thị dữ liệu **Spot** (giao ngay) từ `api.binance.com/api/v3`.
Người dùng không thể xem dữ liệu **Futures** (hợp đồng tương lai) hay **Margin** (ký quỹ) —
đây là 2 loại thị trường quan trọng trong crypto trading.

- **Futures (USD-M Perpetual)**: Giá mark/index khác spot, có funding rate, open interest.
- **Margin**: Giao dịch với đòn bẩy, dùng giá spot nhưng cần biết tỷ lệ vay, các cặp hỗ trợ.

Nguồn dữ liệu:
- Futures: `https://fapi.binance.com/fapi/v1` (100% public, không cần API key)
- Margin pairs: `https://api.binance.com/sapi/v1/margin/allPairs` (public, server-side)
- Exchange info (margin eligibility): `https://api.binance.com/api/v3/exchangeInfo`

## Acceptance Criteria

- [x] `binanceService.ts` có đủ hàm cho futures (tickers, klines, depth, premiumIndex)
- [x] `MarketContext` expose `marketType` (`spot` | `futures` | `margin`) và `setMarketType`
- [x] `MarketContext` cung cấp `futuresAssets` (top 50 futures USDT-M pairs)
- [x] Hook `useFuturesPremiumIndex` lấy mark price, index price, funding rate, next funding time
- [x] `/api/margin-data` route trả về danh sách margin-eligible pairs
- [x] `useChartData` hiển thị đúng klines theo `marketType` (spot/futures)
- [x] `useOrderBook` hiển thị đúng depth theo `marketType` (spot/futures)
- [x] `LeftSidebar` có market type switcher **SPOT / FUTURES / MARGIN** nổi bật
- [x] Danh sách coin hiển thị đúng theo market type đang chọn
- [x] Futures coin row hiển thị funding rate badge
- [x] `CoinInfoPanel` (MainChart) hiển thị mark price, funding rate, next funding khi futures mode
- [x] Margin mode hiển thị badge "MARGIN" và giải thích ngắn
- [x] Không có `any` type trong financial calculations
- [x] Mọi async call đều có try/catch và error handling
- [x] UI loading skeleton khi fetch dữ liệu

## Implementation Plan

- [x] Step 1: Tạo task file này
- [x] Step 2: Mở rộng `src/services/binanceService.ts` — thêm `MarketType`, futures types + functions
- [x] Step 3: Cập nhật `src/context/MarketContext.tsx` — thêm `marketType`, `futuresAssets`
- [x] Step 4: Tạo `src/hooks/useFuturesPremiumIndex.ts`
- [x] Step 5: Tạo `src/app/api/margin-data/route.ts`
- [x] Step 6: Cập nhật `src/hooks/useChartData.ts` — thêm `marketType` param
- [x] Step 7: Cập nhật `src/hooks/useOrderBook.ts` — thêm `marketType` param
- [x] Step 8: Cập nhật `src/components/LeftSidebar.tsx` — market switcher + futures badges
- [x] Step 9: Cập nhật `src/components/MainChart.tsx` — CoinInfoPanel futures data
- [x] Step 10: Cập nhật `src/components/OrderBook.tsx` — truyền `marketType`

## Files Changed

- `src/services/binanceService.ts`
- `src/context/MarketContext.tsx`
- `src/hooks/useFuturesPremiumIndex.ts` *(new)*
- `src/app/api/margin-data/route.ts` *(new)*
- `src/hooks/useChartData.ts`
- `src/hooks/useOrderBook.ts`
- `src/components/LeftSidebar.tsx`
- `src/components/MainChart.tsx`
- `src/components/OrderBook.tsx`

## Notes

- Futures data từ `fapi.binance.com` không cần API key — hoàn toàn public
- Margin SAPI endpoints có thể không cần auth cho read-only pairs list — proxy qua server route
- `MarketType = 'spot' | 'futures' | 'margin'` là union type dùng chung toàn app
- Khi `marketType === 'margin'`, chart/depth dùng spot data (vì margin dùng spot orderbook)
- Funding rate hiển thị: dương (xanh) = longs trả shorts; âm (đỏ) = shorts trả longs
- `selectedSymbol` (ví dụ "BTCUSDT") hoạt động nhất quán trên cả 3 loại market
