# FinTrace — Architecture Documentation

> **Version:** 1.0.0 | **Updated:** 2026-03-23  
> This document describes the technical architecture of FinTrace.

---

## 1. Project Overview

**FinTrace** is a real-time financial tracking and AI analysis dashboard built with:

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript 5.8 (strict) |
| Styling | Tailwind CSS v4 + CSS Custom Properties |
| Charts | Recharts |
| Animations | Framer Motion (`motion`) |
| Data Source | Binance Public REST API |
| AI Features | Google Gemini (`@google/genai`) |
| Package Manager | npm |
| Runtime | Node.js (macOS dev) |

---

## 2. Folder Structure

```
fintrace/
├── .agents/                  # AI agent rules & workflows
│   ├── AGENT_RULES.md        # Master rules (read this first!)
│   └── workflows/            # Slash-command workflows
├── docs/                     # Project documentation
│   ├── ARCHITECTURE.md       # This file
│   ├── API.md                # External API documentation
│   └── decisions/            # Architecture Decision Records (ADRs)
├── tasks/                    # Task tracking files (TASK-NNN-*.md)
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout (providers, fonts)
│   │   ├── page.tsx          # Home dashboard page
│   │   └── globals.css       # Global styles + CSS tokens
│   ├── components/           # React UI components (presentational)
│   │   ├── MainChart.tsx
│   │   ├── RightPanel.tsx
│   │   ├── AssetList.tsx
│   │   ├── PageLayout.tsx
│   │   └── UserMenu.tsx
│   ├── context/              # React Context providers
│   │   └── MarketContext.tsx
│   ├── hooks/                # Custom React hooks
│   │   └── useMarketData.ts
│   ├── services/             # External API clients
│   │   └── binanceService.ts
│   └── lib/                  # Shared utilities & helpers
│       ├── utils.ts          # General utilities (cn, formatters)
│       └── mockData.ts       # Mock data (dev/test only)
├── __tests__/                # Test files
├── .env.example              # Environment variable template
├── .env.local                # Local secrets (gitignored!)
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 3. Layer Architecture

```
┌─────────────────────────────────────────────┐
│         UI Layer (src/components/)           │
│  Presentational React components, no fetch  │
└────────────────────┬────────────────────────┘
                     │ reads from
┌────────────────────▼────────────────────────┐
│     Universe Layer (src/context/Universe*)   │
│  Global world switch: `coin` / `stock`      │
│  Persists user mode, handles route fallback │
└────────────────────┬────────────────────────┘
                     │ selects adapter/source
┌────────────────────▼────────────────────────┐
│        State Layer (src/context/)            │
│  React Context: MarketContext               │
│  Distributes data to the whole component    │
│  tree without prop drilling                 │
└────────────────────┬────────────────────────┘
                     │ uses
┌────────────────────▼────────────────────────┐
│        Hook Layer (src/hooks/)               │
│  Custom hooks: useMarketData                │
│  Encapsulates polling, state, side-effects  │
└────────────────────┬────────────────────────┘
                     │ calls
┌────────────────────▼────────────────────────┐
│       Service Layer (src/services/)          │
│  binanceService: fetch wrappers, transforms │
│  Pure TypeScript — no React imports         │
└────────────────────┬────────────────────────┘
                     │ HTTP(S)
┌────────────────────▼────────────────────────┐
│         External APIs                        │
│  Binance REST: api.binance.com/api/v3       │
│  Gemini AI: @google/genai                   │
└─────────────────────────────────────────────┘
```

**Rules:**
- Arrows are **one-directional only**. Lower layers do not import from upper layers.
- Components never call `fetch()` directly.
- Services never import from React.
- `UniverseContext` quyết định world hiện tại (`coin` hoặc `stock`) và route fallback khi switch world.
- `MarketContext` vẫn giữ API tương thích ngược, nhưng dữ liệu được chọn theo adapter tương ứng với world.

### 3.1 Multi-World Adapter Model (Phase 1)

- `coin` world: dùng `coinMarketAdapter` (Binance + logo enrichment như hiện tại).
- `stock` world (phase 1): dùng `stockMockMarketAdapter` (mock deterministic, có cờ `isMock`).
- Contract mở rộng:
  - `AssetUniverse = "coin" | "stock"`
  - `MarketDataAdapter` interface
  - `UnifiedAsset` mapper (`toUnifiedAsset`)

> Lưu ý: stock phase 1 là mock-only. Chưa kết nối API stock thật.

---

## 4. Data Flow

### 4.1 Market Data Flow

```
Binance API (30s poll)
    └► binanceService.getTickers()
         └► useMarketData.fetchAssets()
              └► setAssets(mapped)
                   └► MarketContext.assets
                        └► Any component via useMarket()
```

### 4.2 Chart Data Flow

```
User selects symbol
    └► MarketContext.setSelectedSymbol(symbol)
         └► useMarketData detects selectedSymbol change
              └► binanceService.getKlines(symbol)
                   └► setChartData(mapped)
                        └► MarketContext.chartData
                             └► MainChart.tsx
```

### 4.3 Theme Flow

```
User clicks theme toggle (page.tsx)
    └► setTheme(nextTheme)
         └► document.documentElement.setAttribute('data-theme', theme)
              └► CSS custom properties switch in globals.css
```

---

## 5. State Management

FinTrace uses **React Context** (not Redux) because:
- The app has a single "active asset" concept with moderate complexity.
- Redux would add unnecessary boilerplate.
- If the app grows significantly (portfolios, auth, user data), revisit with Zustand or Redux Toolkit.

**Context map:**

| Context | Provider | Consumers |
|---|---|---|
| `MarketContext` | `src/context/MarketContext.tsx` | `MainChart`, `RightPanel`, `AssetList`, `page.tsx` |

---

## 6. Theme System

```css
/* Three themes: light (default), dark, night */
:root               { --bg-main: #FFFFFF; ... }
[data-theme="dark"] { --bg-main: #212124; ... }
[data-theme="night"]{ --bg-main: #0D1117; ... }

/* Accent color (global constant) */
--color-accent: #007AFF;
```

**Adding a new color token:**
1. Add it to all three theme blocks in `globals.css`
2. Map a utility class: `.text-{name} { color: var(--{name}); }`
3. Do NOT hard-code hex in component files

---

## 7. Key Types

```typescript
// src/services/binanceService.ts

export type Asset = {
  id: string;           // e.g. "BTCUSDT"
  symbol: string;       // e.g. "BTC"
  name: string;         // Human-readable name
  price: number;        // Current price in USDT
  change: number;       // 24h absolute price change
  changePercent: number;// 24h percentage change
  marketCap: string;    // Formatted string (may be "-" if unavailable)
  volume24h: string;    // Formatted string
  sparkline: number[];  // Array of recent closing prices
};

export type BinanceTicker = { /* raw Binance shape */ };
```

---

## 8. External API Reference

See `docs/API.md` for full endpoint documentation.

Quick reference:

| Endpoint | Use | Poll interval |
|---|---|---|
| `GET /ticker/24hr` | All asset tickers | 30 seconds |
| `GET /klines` | OHLCV chart data | 5 seconds |
| `GET /depth` | Order book | On demand |

---

## 9. Performance Considerations

| Concern | Current Approach |
|---|---|
| Polling | `setInterval` in `useMarketData` with cleanup |
| Re-renders | `useCallback` on fetch functions |
| Chart updates | Only re-fetch when `selectedSymbol` changes |
| Bundle | Recharts is lazy-safe; monitor with `next build` |

---

## 10. AI API Key Fallback (Client vs Server)

FinTrace UI có thể được cấu hình với API key "của người dùng" (lưu trong `AppSettingsContext`), nhưng **không được giả định** rằng luôn có key đó ở client.

Nguyên tắc khi gọi AI:
1. UI gọi `aiProviderService.chat(...)` (hoặc `chatStream`) và truyền `apiKey` từ Settings nếu có; nếu không có thì truyền `""` (không truyền header `x-*-api-key`).
2. Các route proxy server `src/app/api/*/chat/completions` sẽ **tự fallback** sang key hệ thống:
   - Groq: `src/lib/getGroqKey.ts` (env/AWS Secrets Manager)
   - OpenRouter: `src/lib/getOpenRouterKey.ts` (env/AWS Secrets Manager)
   - Hugging Face: `src/lib/getHuggingFaceKey.ts` (env/AWS Secrets Manager)
3. Vì vậy, UI không nên hiển thị lỗi kiểu "Chưa có API key — thêm trong Settings" ngay lập tức khi `activeProvider.apiKey` rỗng. Chỉ show lỗi nếu server vẫn trả về 401/403 sau khi fallback.

---

## 11. Future Architecture Considerations

These are not yet implemented. They require a TASK before implementation:

- **Authentication:** NextAuth.js or Clerk for user accounts
- **Portfolio Tracking:** User-specific data needs a backend (e.g., Supabase, PlanetScale)
- **WebSocket streams:** Replace REST polling with Binance WebSocket for live ticks
- **Server-side data fetching:** Move ticker fetching to Route Handlers for better caching
- **Error boundary:** Add React Error Boundaries around chart and panel components
- **Monitoring:** Sentry for error tracking in production
