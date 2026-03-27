# TASK-034: Add E2E, Performance Smoke, and Security Test Suite

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Test  
**Created:** 2026-03-27  
**Updated:** 2026-03-27  
**Assignee:** AI Agent / GPT-5.3 Codex

## Context
Repo cần lớp kiểm thử ngoài unit/integration để chặn rủi ro release: e2e smoke, perf smoke, security checks.

## Acceptance Criteria
- [x] Có e2e smoke chạy được trong CI.
- [x] Có perf smoke cho module nóng (query engine/data stream normalize).
- [x] Có security checks script cho dependency và secrets.

## Implementation Plan
- [x] Thiết lập framework e2e và test smoke flows.
- [x] Viết perf smoke tests có threshold.
- [x] Thiết lập script security checks.

## Files Changed
- `e2e/**`
- `src/**/*.perf.test.ts`
- `scripts/security-checks.*`

## Round 2 Notes
- E2E smoke suite and perf suite still passing after expanding integration/unit scope.
- Coverage improved from ~5.29% lines to ~11.68% lines, but still below 100% gate.
- Validation update:
  - `npm run test:e2e` pass.
  - `npm run test:perf` pass.
  - `npm run security:secrets` pass.
  - `npm run security:audit` pass.
