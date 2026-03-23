# TASK-009: AI Dynamic RAG & Language Enforcement

**Status:** [x] Done  
**Priority:** High  
**Type:** Core System Architecture
**Created:** 2026-03-23
**Assignee:** AI Agent

## Context
1. The AI currently only analyzes data and news for the active tab's `selectedSymbol`. If a user looking at the BTC chart asks "What is the price of XRP and what's the news about it?", the AI fails because it's sandboxed.
2. The AI may reply in English to Vietnamese questions if the system instructions lean heavily English. It needs a strict rule to mirror the user's language.

## Architecture & Implementation Strategy (VIP/Tech-Lead Approach)
Instead of forcing unreliable model-specific `tool_calls` which breaks open-source or generic models, we will build an elegant, lightning-fast Client-Side Interceptor (RAG):
1. **Dynamic Context Resolve (`ChatPanel.tsx` & `useAIChat.ts`):** 
   - `useAIChat` will accept an `resolveDynamicContext?: (userText: string) => Promise<string>` hook prop.
   - When the user clicks "Send", we intercept the `userText`.
   - We scan it against our global `assets` array. E.g., if it contains "xrp" or "XRPUSDT".
   - If found, we dynamically inject global price data for those assets AND quickly fetch `newsService.getNews` for those specific symbols.
   - This "Global Context" string is appended to the system prompt seamlessly. The model receives it and answers accurately as if it had instantaneous tool-calling capabilities.
2. **Language enforcement:** Append "CRITICAL RULE: You MUST answer in the EXACT SAME LANGUAGE as the user's most recent question." to the baseline system prompt.

## Acceptance Criteria
- [x] Implement `resolveDynamicContext` in `useAIChat.ts` before the stream opens.
- [x] Implement Regex/Includes RAG in `ChatPanel.tsx` to scan `assets` and fetch cross-symbol news.
- [x] Add the strict language matching rule to the system prompt.
