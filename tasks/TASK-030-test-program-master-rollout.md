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
- [x] Có chiến lược test tổng thể trong docs.
- [x] Có backlog task test theo module.
- [x] Chuẩn hoá test runner sang Vitest và scripts chuẩn.
- [ ] Bổ sung test cho các module quan trọng chưa có coverage.
- [x] Có GitHub Actions cho CI + security.
- [x] Có checklist vận hành và theo dõi flaky/regression.

## Implementation Plan
- [x] Tạo test strategy docs.
- [x] Tạo backlog task test theo module.
- [x] Chuẩn hoá scripts và cấu hình test.
- [ ] Viết và migrate test suites.
- [x] Tạo CI workflows và quality gates.
- [ ] Chạy test và cập nhật bằng chứng.

## Files Changed
- `docs/TEST_MASTER_PLAN.md`
- `docs/CONTRIBUTING.md`
- `docs/TEST_OPERATIONS.md`
- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `vitest.config.ts`
- `vitest.setup.ts`

## Notes
- Mục tiêu coverage đặt ở mức 100%; nếu có ngoại lệ tạm thời phải ghi rõ lý do + ngày hết hạn.
- Vòng 2 (tiếp diễn): tăng coverage cho nhóm `src/app/api/**`, `src/services/**`, `src/lib/get*Key.ts`, `src/services/queryEngineService.ts`.
- Vòng 3: coverage toàn repo đã tăng lên ~21.57% lines; còn thiếu lớn ở `src/components/**`, `src/hooks/**`, và nhiều page routes.
