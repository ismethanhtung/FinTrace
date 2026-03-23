# Logo token (FinTrace)

## Vì sao Binance không đủ?

API ticker Binance (`/api/v3/ticker/24hr`) không trả URL logo. Logo được lấy qua **CoinGecko** (public API), map **base asset** (ví dụ `BTC` từ cặp `BTCUSDT`) → **CoinGecko coin `id`** → ảnh từ endpoint `coins/markets`.

## Kiến trúc

| Thành phần | Vai trò |
|------------|---------|
| `src/services/tokenLogoService.ts` | Cache danh sách coin, resolve `id`, batch `markets`, cache ảnh theo `id` |
| `src/config/tokenLogoOverrides.ts` | Map tay `SYMBOL` → `coingecko-id` khi trùng ticker / sai tự động |
| `src/components/TokenAvatar.tsx` | Hiển thị ảnh; lỗi tải → chữ cái đầu |
| `Asset.logoUrl` | Trường tùy chọn trên model thị trường |

Luồng:

1. `GET /api/v3/coins/list` — cache ~7 ngày (bộ nhớ + `localStorage`).
2. Với mỗi asset: `resolveCoinGeckoId(symbol, list)` (+ overrides).
3. `GET /api/v3/coins/markets?vs_currency=usd&ids=...` theo lô — chỉ gọi cho `id` chưa có trong cache bộ nhớ.

## Mở rộng

- **Sai logo / trùng symbol:** thêm một dòng vào `COINGECKO_ID_OVERRIDES` (giá trị là `id` đúng trên CoinGecko, tra tại trang coin hoặc API list).
- **Provider khác (sau này):** có thể tách interface `TokenLogoProvider` và gọi song song hoặc fallback; hiện tại chỉ triển khai CoinGecko để giảm phức tạp.
- **API key / proxy:** CoinGecko free tier có giới hạn tốc độ; nếu cần, thêm route Next.js proxy + biến môi trường và trỏ `fetch` vào đó.

## Attribution

Dữ liệu logo qua [CoinGecko API](https://www.coingecko.com/en/api). Tuân thủ điều khoản và giới hạn request của họ khi triển khai production.

## Tham chiếu API

- [Coins list](https://docs.coingecko.com/reference/coins-list)
- [Coins markets](https://docs.coingecko.com/reference/coins-markets)
