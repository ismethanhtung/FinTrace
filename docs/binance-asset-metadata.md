# Binance Asset Metadata Integration

> **Updated:** 2026-04-05

## Goal

Bổ sung metadata asset từ Binance catalog (`get-all-asset`) để mở rộng UI coin theo hướng dễ bảo trì và mở rộng tính năng:

1. Icon thông tin `i` trên từng coin ở left sidebar.
2. Bộ lọc/search theo `tags` cho coin.
3. Hiển thị `tags` ở khu vực chart header (dòng thứ 3, sau `1H` và `24h`).

## Data Flow

1. Browser gọi nội bộ `GET /api/binance/assets`.
2. Route handler gọi `https://www.binance.com/bapi/asset/v2/public/asset/asset/get-all-asset`.
3. Route trả về payload gọn, ổn định cho client.
4. `binanceAssetMetadataService` cache metadata:
   - In-memory cache.
   - `localStorage` cache (TTL 6 giờ).
5. `coinMarketAdapter` enrich danh sách coin:
   - `name` từ `assetName`.
   - `tags` cho filter + chart badges.
   - `binanceAssetInfo` cho tooltip/info.

## Files

- `src/app/api/binance/assets/route.ts`
- `src/services/binanceAssetMetadataService.ts`
- `src/services/adapters/coinMarketAdapter.ts`
- `src/components/LeftSidebar.tsx`
- `src/components/MainChart.tsx`

## Asset Model Extension

`Asset` được bổ sung:

- `tags?: string[]`
- `binanceAssetInfo?: { ... }`

Mục tiêu là mở rộng an toàn: không phá vỡ các luồng stock/futures hiện có.

## UI Behavior

### Left Sidebar

- Mỗi coin row có icon `i` (nếu có metadata).
- Search coin hỗ trợ match theo:
  - `symbol`
  - `id`
  - `tags`
- Nút filter (icon phễu) cho coin:
  - Hiển thị danh sách tags.
  - Chọn nhiều tags.
  - Có chip `Selected` để bỏ nhanh.

### Main Chart

- Chart header có thêm dòng `Tags` (coin only).
- Vị trí: ngay dưới dòng `24h`.
- Hỗ trợ desktop (`xl`) và mobile layout.

## Reliability Notes

- Nếu API Binance metadata lỗi: hệ thống fallback về danh sách asset cũ, không chặn UI.
- Tags được chuẩn hóa, loại trùng để tránh noise ở filter.
- Cache TTL 6 giờ giúp giảm tải request lặp lại.

