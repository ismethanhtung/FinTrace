# TASK-035: Configure GitHub Actions Quality Gates

**Status:** [x] In Progress  
**Priority:** Critical  
**Type:** Test  
**Created:** 2026-03-27  
**Updated:** 2026-03-27  
**Assignee:** AI Agent / GPT-5.3 Codex

## Context
Repository chưa có CI pipeline. Cần thiết lập workflow để chặn merge khi fail typecheck/lint/test/security.

## Acceptance Criteria
- [ ] Có workflow CI cho lint/typecheck/tests.
- [ ] Có workflow security riêng.
- [ ] Coverage threshold được enforce trong CI.
- [ ] Có artifacts cho coverage reports.

## Implementation Plan
- [ ] Tạo `ci.yml`.
- [ ] Tạo `security.yml`.
- [ ] Chạy thử local/act-compatible checks và điều chỉnh.

## Files Changed
- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
