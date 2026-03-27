# TASK-031: Add Core Unit Tests for Services and Lib

**Status:** [x] In Progress  
**Priority:** High  
**Type:** Test  
**Created:** 2026-03-27  
**Updated:** 2026-03-27  
**Assignee:** AI Agent / GPT-5.3 Codex

## Context
Nhiều module logic lõi chưa có test hoặc coverage còn mỏng, đặc biệt ở `src/services/**` và `src/lib/**`.

## Acceptance Criteria
- [ ] Unit tests cho các service/lib chưa được cover.
- [ ] Có case happy/edge/error cho từng module.
- [ ] Không có HTTP call thật trong unit tests.

## Implementation Plan
- [ ] Bổ sung test cho các utility thiếu.
- [ ] Bổ sung test cho service parser/guard/error flow.
- [ ] Chạy coverage và xử lý nhánh chưa cover.

## Files Changed
- `src/services/*.test.ts`
- `src/lib/*.test.ts`

## Notes
- Ưu tiên module query engine, token filters, data-stream normalize.
- Round 2 focus: thêm tests cho `getOpenRouterKey`, `getGroqKey`, `getHuggingFaceKey`, `queryEngineService`.
