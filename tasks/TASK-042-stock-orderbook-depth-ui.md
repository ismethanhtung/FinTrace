# TASK-042: Implement Stock Order Book Depth UI from Lambda `price_depth`

**Status:** [ ] Draft | [x] In Progress | [ ] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Feature  
**Created:** 2026-03-30  
**Updated:** 2026-03-30  
**Assignee:** AI Agent

## Context

Hiện tại panel `OrderBook` chỉ chạy cho universe `coin`; với `stock` thì trả thông báo `not implemented yet`. User đã cung cấp dữ liệu thật từ endpoint `price_depth` cho mã cổ phiếu (ví dụ FPT) và yêu cầu thiết kế giao diện đầy đủ, có giá trị, tham khảo giao diện bên coin, đồng thời **không được lẫn luồng coin/stock** vì hệ thống hỗn hợp đa universe.

## Acceptance Criteria

- [ ] `stockLambdaService` có API typed để lấy dữ liệu `price_depth` theo ticker.
- [ ] `useOrderBook` khi `universe=stock` map dữ liệu `price_depth` vào model orderbook chung (bids/asks/spread/mid/depth metrics) bằng luồng tách biệt với coin.
- [ ] `OrderBook` hiển thị đúng dữ liệu stock (đơn vị VND, ticker stock), không dùng websocket Binance/USDT assumptions cho stock.
- [ ] Không phá vỡ hành vi hiện tại của coin spot/futures orderbook + recent trades.
- [ ] Có test cho parser/mapping chính của stock depth để giảm rủi ro nhầm field tiếng Việt.

## Implementation Plan

- [ ] Bổ sung kiểu dữ liệu + hàm parse `price_depth` trong `stockLambdaService`.
- [ ] Tích hợp nhánh stock trong `useOrderBook` bằng polling an toàn, có xử lý lỗi/empty data rõ ràng.
- [ ] Cập nhật UI `OrderBook` để localize labels/units theo universe, giữ phong cách giao diện coin.
- [ ] Viết test cho mapping `price_depth`.
- [ ] Chạy test liên quan + self-review theo checklist acceptance.

## Files Changed

- `tasks/TASK-042-stock-orderbook-depth-ui.md`

## Notes

- Cần parse chính xác các key tiếng Việt: `Giá mua 1..3`, `KL mua 1..3`, `Giá bán 1..3`, `KL bán 1..3`, `Giá khớp lệnh`, `KL Khớp lệnh`.
- Đảm bảo tách bạch domain: coin dùng Binance + websocket; stock dùng Lambda + polling.
