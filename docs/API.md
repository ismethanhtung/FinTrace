# FinTrace — External API Documentation

> **Version:** 1.0.0 | **Updated:** 2026-03-23

---

## 1. Binance Public REST API

**Base URL:** `https://api.binance.com/api/v3`  
**Auth:** None required for public endpoints  
**Rate Limit:** 1200 requests/minute (weight-based)

> ⚠️ **Important:** Do not implement private (signed) endpoints client-side.  
> Private endpoints require HMAC-SHA256 signing with secret keys — server-side only.

### 1.1 GET /ticker/24hr

Returns 24-hour price change statistics for all symbols.

**Usage in FinTrace:** `binanceService.getTickers()`

**Response shape (single item):**
```json
{
  "symbol":             "BTCUSDT",
  "priceChange":        "120.50",
  "priceChangePercent": "0.283",
  "lastPrice":          "42580.00",
  "highPrice":          "43200.00",
  "lowPrice":           "42300.00",
  "volume":             "18500.00",
  "quoteVolume":        "787000000.00",
  "weightedAvgPrice":   "42530.00"
}
```

**FinTrace processing:**
- Filter: Only `symbol.endsWith('USDT')`
- Sort: By `quoteVolume` descending (most liquid first)
- Limit: Top 50 assets
- Polling: Every **30 seconds**

---

### 1.2 GET /klines

Returns OHLCV candlestick data for a symbol.

**Usage in FinTrace:** `binanceService.getKlines(symbol, interval, limit)`

**Parameters:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `symbol` | string | required | e.g. `BTCUSDT` |
| `interval` | string | `1h` | `1m`, `5m`, `15m`, `1h`, `4h`, `1d`, `1w` |
| `limit` | number | 24 | Max 1000 |

**Response (array of arrays):**
```
[
  [
    1499040000000,  // [0] Open time (Unix ms)
    "0.01634790",   // [1] Open
    "0.80000000",   // [2] High
    "0.01575800",   // [3] Low
    "0.01577100",   // [4] Close ← used for chart
    "148976.11427815", // [5] Volume
    ...
  ]
]
```

**FinTrace processing:**
- Map `k[0]` → formatted time label
- Map `k[4]` → closing price value
- Polling: Every **5 seconds** for selected symbol

---

### 1.3 GET /depth

Returns current order book for a symbol.

**Usage in FinTrace:** `binanceService.getDepth(symbol, limit)`

**Parameters:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `symbol` | string | required | e.g. `BTCUSDT` |
| `limit` | number | 20 | Options: 5, 10, 20, 50, 100, 500, 1000 |

**Response:**
```json
{
  "bids": [["42580.00", "0.5"], ...],
  "asks": [["42582.00", "0.3"], ...]
}
```

---

## 2. Google Gemini AI API

**Library:** `@google/genai`  
**Auth:** API Key via environment variable `GEMINI_API_KEY`

> ⚠️ **Security:** The Gemini API key must NEVER be included in client-side code.  
> All Gemini calls must go through a Next.js Route Handler (`app/api/`).

**Planned usage in FinTrace:**
- Market sentiment generation for the Right Panel
- AI chat responses in the "Ask AI" input field

**Environment variable:** Set `GEMINI_API_KEY` in `.env.local` (gitignored).

---

## 3. Environment Variables

All environment variables must be documented here and in `.env.example`.

| Variable | Required | Client-side? | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | For AI features | ❌ Server only | Google Gemini AI API key |
| `NEXT_PUBLIC_APP_ENV` | No | ✅ Yes | `development` or `production` |

**To add a new variable:**
1. Add it to `.env.example` with a placeholder value and comment
2. Add it to this table above
3. Never add secrets with the `NEXT_PUBLIC_` prefix (they are exposed to the browser)
