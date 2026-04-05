# TASK-054: Finish Home Gaps and Continue I18n to Market/Board

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Feature  
**Created:** 2026-04-05  
**Updated:** 2026-04-05  
**Assignee:** AI Agent

## Scope

- Hoàn thiện phần còn thiếu ở trang `/`:
  - Quick Search input + dropdown nội dung.
  - Right panel tab `Summary`.
  - Main chart tab `Info`.
- Tiếp tục rollout i18n cho `/market` và `/board` (mức production-ready cho UI chính).

## Acceptance

- [x] Quick Search đã dùng i18n cho placeholder/title/section labels/states.
- [x] Summary panel đã dùng i18n cho toàn bộ label hiển thị quan trọng.
- [x] Info tab đã migrate i18n cho hầu hết label mục + metadata section.
- [x] `/market` có i18n cho top controls + table headers + stat/indicator cards chính.
- [x] `/board` có i18n cho refresh/status/search + bảng index + empty-state.
- [x] Typecheck pass.

## Files Changed

- `src/components/AssetList.tsx`
- `src/components/ai/SummaryPanel.tsx`
- `src/components/MainChart.tsx`
- `src/app/market/page.tsx`
- `src/app/board/page.tsx`
- `src/i18n/messages/en.ts`
- `src/i18n/messages/vi.ts`
- `tasks/TASK-054-home-gaps-and-market-board-i18n.md`
