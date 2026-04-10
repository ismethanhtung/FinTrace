# TASK-059: Frontend Auth + Settings Migration

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-04-09  
**Updated:** 2026-04-09  
**Assignee:** AI Agent

## Scope

- Add Google sign in/out control in top bar.
- Refactor settings state to support server-first sync when authenticated.
- Keep guest local fallback behavior.
- Prevent plaintext AI key persistence in localStorage for authenticated users.

## Acceptance

- [x] Auth control component integrated into top bar.
- [x] AppSettingsContext fetches/syncs `/api/user/preferences` for authenticated users.
- [x] Provider key writes for authenticated users call `/api/user/ai-keys/:provider`.
- [x] Local persisted providers are sanitized (apiKey stripped) when authenticated.
