# DNSE Test Console (`/dnse-realtime`)

Trang `/dnse-realtime` là công cụ QA để test toàn bộ luồng DNSE hiện có trong repo:

- REST OpenAPI (preset + custom)
- Market Data WebSocket (qua SSE bridge server-side)

## 1) REST API Tester

### Preset APIs

Danh sách preset lấy từ:

- `src/lib/dnse/openapiCatalog.ts`

Bao gồm nhóm:

- Account: `getAccounts`, `getBalances`, `getLoanPackages`, `getPositions`, `closePosition`
- Account: thêm `getPositionById`
- Order: `getOrders`, `getOrderDetail`, `getOrderHistory`, `postOrder`, `putOrder`, `cancelOrder`, `getPpse`
- Market Data: `getSecurityDefinition`, `getOhlc`, `getTrades`, `getLatestTrade`, `getInstruments`
- Auth: `sendEmailOtp`, `createTradingToken`

Tham số mở rộng theo SDK Python:

- Order APIs hỗ trợ thêm `orderCategory` (list/detail/history/post/put/delete)
- `getTrades`: `boardId`, `from`, `to`, `limit`, `order`, `nextPageToken`
- `getLatestTrade`: `boardId`
- `getInstruments`: `symbol`, `symbolType`, `baseSymbol`, `contractType`, `status`, `coveredWarrantType`, `issuer`

### Custom REST

Cho phép test endpoint ngoài preset:

- Chọn `method`
- Nhập `path`
- Nhập `query` / `headers` / `body` dạng JSON object

## 2) Signature và bảo mật

REST request được ký ở backend:

- Header `x-api-key`: từ `DNSE_API_KEY`
- Header `X-Signature`: HMAC SHA256 signature
- Header `Date`: UTC date header
- `trading-token`: chỉ gửi khi operation yêu cầu

Route thực thi:

- `POST /api/dnse/openapi/execute`

Catalog metadata:

- `GET /api/dnse/openapi/catalog`

## 3) WebSocket Tester

Kết nối DNSE WS được bridge qua:

- `GET /api/dnse/realtime/stream`

Input hỗ trợ:

- `symbols`
- `board`
- `marketIndex`
- `resolution`
- `encoding`: `json` hoặc `msgpack`
- `channels`: channel templates hoặc custom list

Channel private theo SDK Python cũng đã hỗ trợ test:

- `orders`
- `positions`
- `account`

Lưu ý: `orders` / `positions` / `account` và `market_index.*` không bắt buộc `symbols`; các channel còn lại vẫn dùng `symbols`.

## 4) Channel templates mặc định

- `security_definition.{board}.json`
- `tick.{board}.json`
- `tick_extra.{board}.json`
- `top_price.{board}.json`
- `expected_price.{board}.json`
- `ohlc.{resolution}.json`
- `market_index.{marketIndex}.json`

## 5) Known gap trong sample SDK

File sample `dnse-openapi-sdk/examples/cancel_deal.js` gọi `client.closeDeal(...)`, nhưng method này chưa có trong `dnse-openapi-sdk/dnse/client.js`.

Nếu cần test endpoint tương ứng, dùng `Custom REST` mode.
