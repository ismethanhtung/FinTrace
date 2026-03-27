# TASK-033: Add Tests for Hooks and Key Components

**Status:** [x] In Progress  
**Priority:** High  
**Type:** Test  
**Created:** 2026-03-27  
**Updated:** 2026-03-27  
**Assignee:** AI Agent / GPT-5.3 Codex

## Context
Các custom hooks và component quan trọng đang thiếu coverage, đặc biệt ở state transition và UI interaction.

## Acceptance Criteria
- [ ] Hooks có test cho loading/success/error/cleanup.
- [ ] Component chính có smoke + interaction tests.
- [ ] Không test implementation detail, ưu tiên hành vi.

## Implementation Plan
- [ ] Bổ sung test hooks theo module ưu tiên.
- [ ] Bổ sung test cho component data-heavy quan trọng.
- [ ] Chạy lại test để kiểm tra flaky behavior.

## Files Changed
- `src/hooks/**/*.test.ts`
- `src/components/**/*.test.tsx`
