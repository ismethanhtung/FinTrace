# TASK-006: AI Analysis Panel + Real News Feed

**Status:** [x] Done  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-03-23  
**Updated:** 2026-03-23  
**Assignee:** AI Agent

## Context

The RightPanel currently has static mock data for sentiment, signals, and news.
Need to fully implement:
1. **AI Chat sessions** — multi-turn, saveable, switchable, persistent via localStorage
2. **OpenRouter integration** — real LLM calls with model picker, API key config in Settings
3. **System prompt config** — per-session, exposing market context to the agent
4. **Real news feed** — CryptoPanic API, filtered by coin symbol, configurable API key in Settings

## Acceptance Criteria

- [x] Right panel has tabs: **Chat** | **News** | **Summary**
- [x] Chat supports multi-turn conversation with streaming response
- [x] Sessions saved to localStorage (title, messages, timestamp)
- [x] Session history sidebar: create new, switch, delete sessions
- [x] Model selector: fetches available models from OpenRouter `/api/v1/models`
- [x] OpenRouter API key + CryptoPanic API key stored in Settings (UI Preferences or new "Integrations" section)
- [x] System prompt is pre-populated with current coin data (price, OHLCV, 24h stats)
- [x] System prompt editable in Settings
- [x] News tab shows real articles from CryptoPanic filtered by current coin symbol
- [x] News refreshes when coin changes
- [x] TypeScript clean, extensible service/hook architecture

## Architecture

```
src/
  services/
    openrouterService.ts      ← OpenRouter API calls (models list, chat)
    newsService.ts            ← CryptoPanic news fetch
  hooks/
    useAIChat.ts              ← Session management + chat logic
    useCoinNews.ts            ← News fetch by symbol
  context/
    AppSettingsContext.tsx    ← Add: openrouterApiKey, cryptoPanicApiKey, selectedModel, systemPrompt
  components/
    RightPanel.tsx            ← Completely rewritten with tabs
    ai/
      ChatPanel.tsx           ← Chat UI + sessions
      NewsPanel.tsx           ← News feed UI
      SummaryPanel.tsx        ← Auto-summary of coin (uses AI)
```

## Files Changed

- `src/context/AppSettingsContext.tsx`
- `src/services/openrouterService.ts` (new)
- `src/services/newsService.ts` (new)
- `src/hooks/useAIChat.ts` (new)
- `src/hooks/useCoinNews.ts` (new)
- `src/components/RightPanel.tsx`
- `src/components/ai/ChatPanel.tsx` (new)
- `src/components/ai/NewsPanel.tsx` (new)
- `src/components/ai/SummaryPanel.tsx` (new)
- `src/app/settings/page.tsx`
