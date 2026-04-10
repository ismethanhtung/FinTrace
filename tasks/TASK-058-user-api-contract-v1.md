# TASK-058: User API Contract V1

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Feature  
**Created:** 2026-04-09  
**Updated:** 2026-04-09  
**Assignee:** AI Agent

## Scope

- Add authenticated user APIs:
  - `GET/PUT /api/user/preferences`
  - `GET/POST/DELETE /api/user/favorites`
  - `GET/POST/DELETE /api/user/pins`
  - `GET /api/user/ai-keys`
  - `PUT/DELETE /api/user/ai-keys/:provider`
- Normalize errors and runtime.

## Acceptance

- [x] Node.js runtime on DB routes.
- [x] 401/422/429 paths added where needed.
- [x] Minimal rate-limit for sensitive AI-key write/delete APIs.
