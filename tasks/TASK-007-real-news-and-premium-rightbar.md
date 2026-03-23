# TASK-007: Real News and Premium Right Bar

**Status:** [x] Done  
**Priority:** High  
**Type:** Feature + UI Redesign  
**Created:** 2026-03-23  
**Updated:** 2026-03-23  
**Assignee:** AI Agent

## Context

User requested two major improvements:
1. Replace "fake" / mocked CryptoPanic news with real news that actually fetches data. We will switch the news provider to Min-API CryptoCompare which is free and doesn't strictly bounce requests without an API key, allowing users to see real market news.
2. Redesign the Right Side Panel (AI Analysis, News, Summary) entirely to achieve a "WOW" factor. Needs a premium, modern, sleek dark mode aesthetic with glassmorphism and smooth animations.

## Acceptance Criteria

- [x] `newsService` uses Google News RSS (via Next.js API route) to fetch real, highly reliable news for the selected coin without needing any API Keys.
- [x] Fallback to mock data only if API fails, but default to real fetched data.
- [x] `RightPanel` gets a premium layout update, sleek segmented control tabs.
- [x] `NewsPanel` uses beautiful, interactive cards with glow states and glassmorphic styling.
- [x] `ChatPanel` receives premium chat bubbles and input area styling.
- [x] `SummaryPanel` gets better visual hierarchy and metrics design.
- [x] Maintain adherence to `CODING_CONVENTIONS.md` (types, colors via CSS variables, standard UI components).

## Implementation Plan

1. **News Feature:** Built a Next.js server route `/api/news` to proxy fetch `https://news.google.com/rss/search` and parse it using `rss-parser`. This completely bypasses CORS errors and requires zero API keys. Updated `newsService.ts` to consume this local endpoint.
2. **RightPanel Core UI:** Modernized `RightPanel.tsx` with top-tier glassmorphism and animated segmented tabs using `motion/react`.
3. **NewsPanel UI:** Mapped Google News data to stunning glassmorphism cards.
4. **ChatPanel UI:** Updated bubbles, input box with glowing borders, and history panel.
5. **SummaryPanel UI:** Polished the metrics cards, beautiful progressive sentiment indicators. 

## Files to Edit
- `src/services/newsService.ts`
- `src/hooks/useCoinNews.ts`
- `src/components/RightPanel.tsx`
- `src/components/ai/NewsPanel.tsx`
- `src/components/ai/ChatPanel.tsx`
- `src/components/ai/SummaryPanel.tsx`
