# TASK-026: Add Dedicated News Page

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

User requested a dedicated `/news` page with a professional layout and the same article fetching strategy already used in:
- Market page insights (`/api/market-news`)
- Right sidebar news tab (`/api/news` via `useCoinNews`)

The page should be visually polished, responsive, and consistent with existing FinTrace theme/style.

## Acceptance Criteria

- [x] Route is accessible at `/news`
- [x] Page exports proper metadata (`title`, `description`)
- [x] Includes market-level AI-enriched headlines fetched with `useMarketNews`
- [x] Includes symbol-focused latest articles fetched with `useCoinNews`
- [x] Has responsive and clean layout for desktop/tablet
- [x] Reuses existing services/hooks (no duplicated fetch logic)
- [x] No TypeScript/lint errors from newly added files

## Implementation Plan

- [x] Review project rules/docs/workflow (`AGENT_RULES`, architecture, coding conventions)
- [x] Review existing news fetch implementations (`useMarketNews`, `useCoinNews`, related API routes/components)
- [x] Create new route `src/app/news/page.tsx` with metadata
- [x] Implement client page component with premium layout and sections
- [x] Wire market news + coin news states, loading and error handling
- [x] Validate with lints and update this task as done

## Files Changed

- `tasks/TASK-026-add-dedicated-news-page.md` (created)
- `src/app/news/page.tsx` (created)
- `src/app/news/loading.tsx` (created)
- `src/components/news/NewsPageClient.tsx` (created)

## Notes

- Keep architecture layering intact: UI → hooks/services → route handlers.
- Preserve existing theme token usage and avoid hard-coded colors where possible.
- `next lint` script in current setup reports invalid directory (`/lint`), so verification used IDE lints + `npx tsc --noEmit`.
