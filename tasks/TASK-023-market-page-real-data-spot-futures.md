# TASK-023: Hoàn chỉnh trang /market với data thật (Spot + Futures)

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature + Refactor  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

Yêu cầu:
- Hiện thực hoàn chỉnh `/market` cho cả **Spot + Futures**
- Giữ nguyên giao diện hiện tại, không thay đổi layout/style
- Data nào fetch được thì dùng data thật
- Data nào chưa fetch được thì giữ nguyên/fallback và báo rõ
- Viết task file đầy đủ, rõ ràng, đúng quy trình
- Tận dụng API đang có và refactor theo hướng tái sử dụng

## Acceptance Criteria

- [x] Bảng market dùng dữ liệu thật từ Binance cho Spot
- [x] Bảng market dùng dữ liệu thật từ Binance cho Futures
- [x] Nút Spot/Futures trên `/market` đồng bộ với `MarketContext`
- [x] Search + pagination tiếp tục hoạt động
- [x] Không thay đổi cấu trúc UI chính của trang
- [x] Có refactor theo hướng tách API/hook dùng lại được
- [x] Có ghi rõ dữ liệu nào chưa thể fetch
- [x] TypeScript check pass

## Implementation Plan

- [x] Tạo lớp API dùng lại cho metric hàng market (`src/api/market/marketPageApi.ts`)
- [x] Tạo hook tổng hợp data cho trang (`src/hooks/useMarketPageData.ts`)
- [x] Thay mock data trong `src/app/market/page.tsx` bằng dữ liệu từ hook/context
- [x] Đồng bộ tab Spot/Futures với `MarketContext.setMarketType`
- [x] Dùng data thật cho `price`, `1h%`, `24h%`, `7d%`, `24h volume`, sparkline 7 ngày
- [x] Giữ fallback cho field không có từ Binance ticker public
- [x] Chạy kiểm tra type/lint khả dụng trong môi trường hiện tại

## Những gì đã làm được

1. **Refactor API layer để tái sử dụng**
   - Thêm `src/api/market/marketPageApi.ts`
   - Tách logic fetch metric theo symbol:
     - `1h %` từ klines `1H` (2 nến gần nhất)
     - `7d %` từ klines `1D` (8 nến gần nhất)
     - sparkline 7 ngày từ chuỗi close giá `1D`
   - Dùng chung cho cả spot/futures qua `MarketType`

2. **Tạo hook tổng hợp cho trang /market**
   - Thêm `src/hooks/useMarketPageData.ts`
   - Lấy dữ liệu nền từ `MarketContext` (spotAssets/futuresAssets)
   - Build rows cho table:
     - `price` từ ticker thật
     - `24h %` từ ticker thật
     - `1h %` và `7d %` từ klines thật
     - `24h volume` từ `quoteVolumeRaw` thật
   - Cung cấp `refetch()` để nút refresh sử dụng được thực tế

3. **Nối trang /market vào data thật**
   - Cập nhật `src/app/market/page.tsx`:
     - Bỏ `CRYPTO_DATA` mock
     - Spot/Futures tab đổi `marketType` thật
     - Search/pagination chạy trên data thật
     - Row avatar ưu tiên logo thật nếu có
     - Thêm trạng thái "Loading market data..." khi chưa có row

4. **Giữ nguyên giao diện**
   - Không thay đổi cấu trúc layout, class styling, table columns, cards, filter chips, pagination style
   - Chỉ thay nguồn dữ liệu và wiring logic

## Dữ liệu fetch được (đã dùng data thật)

- `Price` (spot/futures)
- `24h %`
- `1h %` (từ kline 1H)
- `7d %` (từ kline 1D)
- `24h Volume` (quote volume theo USDT)
- `Sparkline 7 ngày` (close price 1D)
- `Spot/Futures list` (USDT pairs)
- `Logo token` (qua hệ thống marketing symbols đã có sẵn)

## Dữ liệu chưa fetch được / đang fallback

1. **Market Cap (theo từng coin)**
   - Binance public ticker/klines không cung cấp market cap
   - Hiện fallback `"-"` tại từng hàng

2. **Circulating Supply**
   - Binance public endpoints đang dùng không có circulating supply
   - Hiện fallback `"-"` tại từng hàng

3. **Top card: Market Cap tổng**
   - Không có nguồn market cap toàn thị trường trong API Binance đang dùng
   - Giữ giá trị fallback hiện có trên UI

4. **Fear & Greed / Altcoin Season / Average RSI cards**
   - Chưa có API nội bộ hoặc endpoint public hiện đang tích hợp trong codebase
   - Giữ nguyên giá trị fallback hiện tại để không phá UI

## Files Changed

- `src/api/market/marketPageApi.ts` *(new)*
- `src/hooks/useMarketPageData.ts` *(new)*
- `src/app/market/page.tsx`
- `tasks/TASK-023-market-page-real-data-spot-futures.md` *(new)*

## Validation

- `ReadLints` cho các file vừa sửa: **không có lỗi**
- `npx tsc --noEmit`: **pass**
- `npm run lint`: **không chạy được trong môi trường hiện tại** do script/CLI lint của Next bị cấu hình sai tham số (`Invalid project directory .../lint`)

## Notes

- Luồng dữ liệu `/market` hiện đã thực sự chạy theo Spot/Futures thật từ Binance.
- Các trường không thể lấy từ API hiện tại đã được giữ fallback và liệt kê đầy đủ ở trên.
