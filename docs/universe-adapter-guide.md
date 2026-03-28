# Universe Adapter Guide (Coin/Stock)

## Mục tiêu

Tài liệu này mô tả cách FinTrace chuyển giữa 2 world dữ liệu:

- `coin`: dữ liệu thật từ Binance
- `stock`: mock data (phase 1)

với cùng một UI shell.

## Các thành phần chính

- `src/context/UniverseContext.tsx`
  - Single source of truth cho `AssetUniverse`.
  - Persist localStorage (`ft-asset-universe`).
  - Route switch behavior: giữ route nếu supported, fallback `/market`.
- `src/context/MarketContext.tsx`
  - API cũ giữ nguyên cho consumer hiện tại.
  - Chọn adapter theo universe để nạp assets.
- `src/services/marketDataAdapter.ts`
  - Định nghĩa `MarketDataAdapter`, `UnifiedAsset`, `UnifiedMarketStats`.
- `src/services/adapters/coinMarketAdapter.ts`
  - Adapter coin dùng Binance service hiện tại.
- `src/services/adapters/stockMockMarketAdapter.ts`
  - Adapter stock mock deterministic.

## Cách nối stock data thật ở phase sau

1. Tạo adapter mới: ví dụ `stockMarketAdapter.ts` implement `MarketDataAdapter`.
2. Mapping response provider stock sang contract `Asset`/`UnifiedAsset`.
3. Thay `stockMockMarketAdapter` trong `MarketContext` bằng adapter mới.
4. Giữ `isMock=false` cho stock real data và bỏ các mock warning badges.
5. Bổ sung tests integration cho stock provider routes/services.

## Quy tắc an toàn

- Không trộn state coin/stock trong cùng một asset source.
- Khi universe = stock nhưng chưa có backend thật, luôn hiển thị mock indicators rõ ràng.
- Hooks realtime phải short-circuit ở stock mock mode để tránh gọi API Binance với symbol không hợp lệ.

