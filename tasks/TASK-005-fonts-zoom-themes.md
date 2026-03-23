# TASK-005: Font Settings + Chart Pan/Scroll + 5 Dark Themes

**Status:** [x] Done  
**Priority:** High  
**Type:** Feature + UI Enhancement  
**Created:** 2026-03-23  
**Updated:** 2026-03-23  
**Assignee:** AI Agent

## Context

User review of TASK-004 identified 3 improvements:
1. Font feels too narrow/tight — want font chooser in Settings (UI preferences section)
2. Chart cannot be panned (drag left/right) or scrolled (mouse wheel) to view historical data
3. The 2 existing dark themes (dark, night) are not satisfactory — need 5 new dark variants replacing them: dark1..dark5

## Acceptance Criteria

- [ ] Settings page has a new "UI Preferences" section with font selector (Inter, Outfit, Plus Jakarta Sans, IBM Plex Sans, Space Grotesk)
- [ ] Font choice persists to localStorage and applies globally via CSS variable
- [ ] Chart supports pan (mouse drag left/right) to shift the visible window of candles
- [ ] Chart supports scroll (mouse wheel) to zoom in/out or extend historical data
- [ ] Viewing history: panning far left triggers fetching older candles from Binance (startTime param)
- [ ] 5 dark themes replace old dark/night: dark1, dark2, dark3, dark4, dark5 with distinct palettes
- [ ] Theme toggle in header cycles through: light → dark1 → dark2 → dark3 → dark4 → dark5 → light
- [ ] TypeScript clean

## Implementation Plan

- [x] `globals.css` — add 5 dark theme CSS variable blocks + Google Font imports for new fonts
- [x] `src/context/AppSettingsContext.tsx` — new context for font + theme preference (localStorage)
- [x] `src/app/layout.tsx` — wrap with AppSettingsProvider
- [x] `src/app/settings/page.tsx` — add "UI Preferences" section with font picker
- [x] `src/app/page.tsx` — update theme toggle to cycle through 5 dark themes
- [x] `binanceService.ts` — add `endTime` param support to `getKlines()`
- [x] `useChartData.ts` — add viewport state (endIndex, windowSize) + pan/zoom logic + history fetch
- [x] `MainChart.tsx` — add mouse event handlers for drag-pan and wheel-zoom on chart area

## Files Changed

- `src/app/globals.css`
- `src/context/AppSettingsContext.tsx` (new)
- `src/app/layout.tsx`
- `src/app/settings/page.tsx`
- `src/app/page.tsx`
- `src/services/binanceService.ts`
- `src/hooks/useChartData.ts`
- `src/components/MainChart.tsx`
