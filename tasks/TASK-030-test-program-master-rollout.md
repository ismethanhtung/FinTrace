# TASK-030: Master Rollout for Full Test Program

**Status:** [ ] Draft | [x] In Progress | [ ] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Test  
**Created:** 2026-03-27  
**Updated:** 2026-03-27  
**Assignee:** AI Agent / GPT-5.3 Codex

## Context
Repository cần chuẩn hoá kiểm thử toàn diện theo nhiều lớp (unit/integration/e2e/contract/perf/security), có quality gates trên CI và tài liệu vận hành rõ ràng.

## Acceptance Criteria
- [ ] Có chiến lược test tổng thể trong docs.
- [ ] Có backlog task test theo module.
- [ ] Chuẩn hoá test runner sang Vitest và scripts chuẩn.
- [ ] Bổ sung test cho các module quan trọng chưa có coverage.
- [ ] Có GitHub Actions cho CI + security.
- [ ] Có checklist vận hành và theo dõi flaky/regression.

## Implementation Plan
- [x] Tạo test strategy docs.
- [ ] Tạo backlog task test theo module.
- [ ] Chuẩn hoá scripts và cấu hình test.
- [ ] Viết và migrate test suites.
- [ ] Tạo CI workflows và quality gates.
- [ ] Chạy test và cập nhật bằng chứng.

## Files Changed
- `docs/TEST_MASTER_PLAN.md`
- `docs/CONTRIBUTING.md`

## Notes
- Mục tiêu coverage đặt ở mức 100%; nếu có ngoại lệ tạm thời phải ghi rõ lý do + ngày hết hạn.
