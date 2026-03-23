# Logo token (FinTrace)

## Mục tiêu

FinTrace không còn phụ thuộc vào CoinGecko để lấy logo token trong runtime. Logo hiện được resolve từ metadata marketing của Binance để:

- tránh rate limit của CoinGecko
- giữ một nguồn logo thống nhất cho spot và futures
- giảm số request lặp lại ở client

## Kiến trúc

| Thành phần | Vai trò |
|------------|---------|
| `src/app/api/binance/marketing-symbols/route.ts` | Fetch server-side từ Binance marketing API, trả về payload gọn cho client |
| `src/services/tokenLogoService.ts` | Cache metadata trong memory + `localStorage`, build catalog lookup, resolve `logoUrl` cho asset |
| `src/config/tokenLogoOverrides.ts` | Override thủ công khi cần ép một asset dùng key lookup khác |
| `src/context/MarketContext.tsx` | Enrich logo cho cả danh sách spot và futures |
| `src/components/TokenAvatar.tsx` | Hiển thị ảnh; lỗi tải thì fallback sang chữ cái đầu |
| `Asset.logoUrl` | Trường tùy chọn trên model thị trường |

## Luồng dữ liệu

1. Client gọi `/api/binance/marketing-symbols`.
2. Route handler gọi `https://www.binance.com/bapi/composite/v1/public/marketing/symbol/list`.
3. Route chỉ trả về các field cần thiết như `symbol`, `baseAsset`, `quoteAsset`, `logo`, `mapperName`.
4. `tokenLogoService` cache danh sách này trong memory và `localStorage`.
5. Với mỗi asset:
   - ưu tiên match theo trading symbol đầy đủ như `BTCUSDT`
   - fallback sang `${baseAsset}USDT`
   - fallback tiếp theo `baseAsset`
   - cuối cùng thử `mapperName`
6. Nếu không resolve được logo, UI vẫn render bình thường với fallback text avatar.

## Matching strategy

- **Spot:** `BTCUSDT` sẽ match trực tiếp vào entry cùng symbol.
- **Futures perpetual:** nếu symbol futures không có entry exact, service sẽ fallback về `baseAsset` như `BTC` rồi thử `BTCUSDT`.
- **Multiplier assets:** các symbol như `1000SATS` được giữ nguyên, không tự ý rút gọn để tránh map sai logo.
- **Duplicate entries:** catalog ưu tiên entry có `logo`, quote asset `USDT`, và entry public hơn.

## Cache

- **Server cache:** route dùng revalidation để tránh gọi Binance marketing endpoint quá thường xuyên.
- **Client cache:** metadata được giữ trong memory và `localStorage` trong 6 giờ.
- **Request dedupe:** nhiều request đồng thời sẽ dùng chung một promise thay vì bắn nhiều lần.

## Override thủ công

Nếu một asset cần ép sang key khác, thêm vào `BINANCE_LOGO_KEY_OVERRIDES` trong `src/config/tokenLogoOverrides.ts`.

Ví dụ:

```ts
export const BINANCE_LOGO_KEY_OVERRIDES = {
    BTCUSDT: "BTCUSDT",
    BTC: "BTC",
};
```

## Tham chiếu API

- [Binance Marketing Symbol List](https://www.binance.com/bapi/composite/v1/public/marketing/symbol/list)
