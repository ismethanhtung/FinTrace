# DNSE Realtime Mapping for `/board`

## Mục tiêu

Nối dữ liệu realtime DNSE WebSocket vào bảng điện `src/app/board/page.tsx` theo đúng field mapping nghiệp vụ, thay cho dữ liệu `0`/mock.

## Luồng dữ liệu

1. Browser mở `EventSource` tới `GET /api/dnse/realtime/stream`.
2. Route server-side dùng `DNSE_API_KEY` + `DNSE_API_SECRET` để auth WS:
   - `wss://ws-openapi.dnse.com.vn/v1/stream?encoding=json`
3. Sau `auth_success`, route subscribe các channel thị trường theo danh sách symbol.
   Board page đang dùng multi-board để không bỏ sót mã theo sàn:
   - `security_definition.G1/G2/G3.json`
   - `tick.G1/G2/G3.json`
   - `tick_extra.G1/G2/G3.json`
   - `top_price.G1/G2/G3.json`
   - `expected_price.G1/G2/G3.json`
   - `ohlc.{resolution}.json`
   - `market_index.{marketIndex}.json`
4. Route forward message sang SSE event `message`.
5. `useDnseBoardStream` parse payload và merge incremental state theo từng `symbol`.
6. `board/page.tsx` overlay state realtime lên base asset list để render bảng.

## Keepalive

- Server DNSE gửi `PING` định kỳ.
- Route sẽ phản hồi `PONG` khi nhận ping.
- Route cũng gửi `pong` proactive mỗi 2 phút để tăng độ ổn định khi ping frame bị miss.

## Mapping cột bảng

### 1) Security Definition

- `Mã`: `symbol`
- `Trần`: `ceilingPrice`
- `Sàn`: `floorPrice`
- `TC`: `basicPrice`

### 2) Quote (Độ sâu thị trường)

- `Bên mua`:
  - `Giá 1 / KL 1` lấy từ `bid[0]` (best bid)
  - UI đang hiển thị theo layout `Giá 3 → Giá 1`, nên mảng hiển thị được đảo chiều từ top 3 bid.
- `Bên bán`:
  - `Giá 1 / KL 1` lấy từ `offer[0]` (best offer)
  - Hiển thị tuần tự `Giá 1 → Giá 3`.
- `KL mua tổng`: `totalBidQtty`
- `KL bán tổng`: `totalOfferQtty`
- `Lệch`: `totalBidQtty - totalOfferQtty`

### 3) Trade / Trade Extra

- `Khớp lệnh - Giá`: `price`
- `Khớp lệnh - KL`: `quantity`
- `+/-`: `price - basicPrice`
- `+/- (%)`: `(price - basicPrice) / basicPrice * 100`
- `Tổng KL`: `totalVolumeTraded`
- `Cao`: `highestPrice`
- `Thấp`: `lowestPrice`

## Giới hạn subscribe

- Hook giới hạn tối đa **300 symbol** mỗi SSE session.
- Nếu tab có nhiều hơn 300 mã, UI hiển thị cảnh báo `giới hạn 300 mã`.
- Hook stream ưu tiên danh sách đang hiển thị theo tab/filter để tăng xác suất thấy giá nhảy ngay.

## Lọc theo nhóm chỉ số/sàn

- `VN30` -> ưu tiên board `G1`
- `HNX30` -> ưu tiên board `G2`
- `HOSE` -> board `G1`
- `HNX` -> board `G2`
- `UPCOM` -> board `G3`
- Các tab còn lại -> subscribe đồng thời `G1,G2,G3`

## Snapshot bootstrap

- Trước khi tick realtime về, `/board` gọi hydrate snapshot nhanh cho tối đa 120 mã đang hiển thị.
- Mục tiêu: giảm hàng loạt số `0` đầu phiên hoặc khi mới mở trang.

## File chính

- Route stream: `src/app/api/dnse/realtime/stream/route.ts`
- Hook SSE: `src/hooks/useDnseBoardStream.ts`
- Parser/mapping: `src/lib/dnse/boardRealtime.ts`
- UI board: `src/app/board/page.tsx`
