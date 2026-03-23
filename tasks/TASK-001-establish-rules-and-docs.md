# TASK-001: Establish Project Foundation Rules & Documentation

**Status:** [x] Done  
**Priority:** Critical  
**Type:** Docs / Chore  
**Created:** 2026-03-23  
**Updated:** 2026-03-23  
**Assignee:** AI Agent (Antigravity)

## Context

Before continuing development on FinTrace, we need to establish clear rules, documentation, and agent workflows. The project is a Next.js financial dashboard using Binance real-time data and Gemini AI analysis. Without proper guardrails, AI agents risk:
- Making unsafe changes to shared architecture
- Inconsistent code style across components
- Missing error handling for financial data
- No traceability of what changed and why

## Acceptance Criteria

- [x] Master rule file created at `.agents/AGENT_RULES.md`
- [x] Architecture documentation at `docs/ARCHITECTURE.md`
- [x] External API documentation at `docs/API.md`
- [x] Coding conventions with examples at `docs/CODING_CONVENTIONS.md`
- [x] Contributing guide at `docs/CONTRIBUTING.md`
- [x] Task management protocol defined (this file as example)
- [x] Agent workflows for: new-feature, bug-fix, new-page, new-api-integration, refactor, write-tests
- [x] README updated with documentation links

## Implementation Plan

- [x] Audit project structure (all source files)
- [x] Read existing conversation history for context
- [x] Create `.agents/` directory with master rules
- [x] Create `docs/` directory with architecture + API docs
- [x] Create `docs/CODING_CONVENTIONS.md` with concrete examples
- [x] Create `docs/CONTRIBUTING.md` for onboarding
- [x] Create `.agents/workflows/` with all slash-command workflows
- [x] Create `tasks/` directory with this file as first example
- [x] Update `README.md` with documentation index

## Files Changed

- `.agents/AGENT_RULES.md` (created)
- `.agents/workflows/new-feature.md` (created)
- `.agents/workflows/bug-fix.md` (created)
- `.agents/workflows/new-page.md` (created)
- `.agents/workflows/new-api-integration.md` (created)
- `.agents/workflows/refactor.md` (created)
- `.agents/workflows/write-tests.md` (created)
- `docs/ARCHITECTURE.md` (created)
- `docs/API.md` (created)
- `docs/CODING_CONVENTIONS.md` (created)
- `docs/CONTRIBUTING.md` (created)
- `tasks/TASK-001-establish-rules-and-docs.md` (this file)
- `README.md` (updated)

## Notes

- Project uses Next.js App Router (not Pages Router)
- Tailwind CSS v4 is in use — different from v3 in some configurations
- `strict: false` currently in tsconfig.json — recommend enabling `strict: true` in a future task
- `express` and `vite` are in `dependencies` but may be vestigial from project scaffolding — clean up in a future chore task
- The `mockData.ts` file exists but market data is now real-time via Binance — can be removed in a future cleanup task
