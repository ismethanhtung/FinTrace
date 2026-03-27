# TASK-035: Configure GitHub Actions Quality Gates

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Test  
**Created:** 2026-03-27  
**Updated:** 2026-03-27  
**Assignee:** AI Agent / GPT-5.3 Codex

## Context
Repository chưa có CI pipeline. Cần thiết lập workflow để chặn merge khi fail typecheck/lint/test/security.

## Acceptance Criteria
- [x] Có workflow CI cho lint/typecheck/tests.
- [x] Có workflow security riêng.
- [x] Coverage threshold được enforce trong CI.
- [x] Có artifacts cho coverage reports.

## Implementation Plan
- [x] Tạo `ci.yml`.
- [x] Tạo `security.yml`.
- [x] Chạy thử local/act-compatible checks và điều chỉnh.

## Files Changed
- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `package.json`

## Notes
- CI được chỉnh để chạy `test:coverage:unit` trước coverage gate nhằm đảm bảo luôn có `coverage/coverage-summary.json` mới trong pipeline.
- Workflow security gồm dependency audit + secret scan + CodeQL.
