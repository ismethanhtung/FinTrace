# TASK-032: Add Integration and Contract Tests for API Routes

**Status:** [x] In Progress  
**Priority:** High  
**Type:** Test  
**Created:** 2026-03-27  
**Updated:** 2026-03-27  
**Assignee:** AI Agent / GPT-5.3 Codex

## Context
Các API routes trong `src/app/api/**` cần được kiểm thử status code, payload contract và error handling để tránh regression.

## Acceptance Criteria
- [ ] Có integration tests cho route chính.
- [ ] Có contract tests cho payload thành công/lỗi.
- [ ] Có mock rõ ràng cho dependency service.

## Implementation Plan
- [ ] Chọn route critical path để cover trước.
- [ ] Viết test cho request/response contract.
- [ ] Bổ sung cases error, timeout, malformed payload.

## Files Changed
- `src/app/api/**/*.test.ts`

## Notes
- Ưu tiên `/api/news`, `/api/market-news`, `/api/query/nlq`.
- Round 2 progress:
  - Added tests for `/api/general-news` and `/api/query/search`.
  - Existing tests for `/api/news` and `/api/query/nlq` kept passing.
