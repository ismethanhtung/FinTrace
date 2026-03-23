# TASK-008: Accurate AI Sentiment and Chat News Integration

**Status:** [x] Done  
**Priority:** High  
**Type:** Feature Enhancement
**Created:** 2026-03-23
**Assignee:** AI Agent

## Context
1. The user liked the tabular AI Sentiment display but pointed out the "78%" confidence score was hardcoded/mocked. It must be computed dynamically using real data (e.g., price position relative to 24h High/Low and 24h Change) to represent true "Intraday Momentum/Sentiment".
2. The AI Chat should have an option (Switch/Toggle) to read the latest Market News to significantly enrich its analysis capabilities.

## Acceptance Criteria
- [x] Remove all hardcoded "78%" and string placeholders in `SummaryPanel.tsx`.
- [x] Implement a real indicator calculation (e.g., Target Intraday Momentum using `(price - low24h) / (high24h - low24h) * 100`).
- [x] Add a "Include News" toggle in `ChatPanel.tsx`'s header or input area.
- [x] Fetch/use `useCoinNews` data inside `ChatPanel.tsx` and append a summary of the latest headlines to the AI's prompt context when the switch is ON.
- [x] Ensure proper UI styling for the toggle and indicators.

## Implementation Steps
1. **SummaryPanel Logic:** Compute `bullishPower = ((currentPrice - low24h) / (high24h - low24h)) * 100`. Use this for the confidence percentage and the bear/bull bar. Adjust text labels to accurately describe the mathematical output.
2. **ChatPanel News Context:** Add `includeNews` state. Call `useCoinNews({ symbol: selectedSymbol })` in `ChatPanel`. If `includeNews` is true, map `news.slice(0, 5)` into a string block and append it to `contextSummary` before passing to `useAIChat`.
3. **ChatPanel UI:** Add a sleek toggle button using `lucide-react` icons (e.g., `Newspaper`).
