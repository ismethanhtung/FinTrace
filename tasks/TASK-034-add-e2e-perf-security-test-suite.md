# TASK-034: Add E2E, Performance Smoke, and Security Test Suite

**Status:** [x] In Progress  
**Priority:** High  
**Type:** Test  
**Created:** 2026-03-27  
**Updated:** 2026-03-27  
**Assignee:** AI Agent / GPT-5.3 Codex

## Context
Repo cần lớp kiểm thử ngoài unit/integration để chặn rủi ro release: e2e smoke, perf smoke, security checks.

## Acceptance Criteria
- [ ] Có e2e smoke chạy được trong CI.
- [ ] Có perf smoke cho module nóng (query engine/data stream normalize).
- [ ] Có security checks script cho dependency và secrets.

## Implementation Plan
- [ ] Thiết lập framework e2e và test smoke flows.
- [ ] Viết perf smoke tests có threshold.
- [ ] Thiết lập script security checks.

## Files Changed
- `e2e/**`
- `src/**/*.perf.test.ts`
- `scripts/security-checks.*`

## Round 2 Notes
- E2E smoke suite and perf suite still passing after expanding integration/unit scope.
- Coverage improved from ~5.29% lines to ~11.68% lines, but still below 100% gate.
