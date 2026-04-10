# TASK-056: Auth Foundation (Google + MongoDB)

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Feature  
**Created:** 2026-04-09  
**Updated:** 2026-04-09  
**Assignee:** AI Agent

## Scope

- Add Auth.js with Google provider.
- Add MongoDB Atlas connector and index bootstrap.
- Expose NextAuth route handlers in App Router.
- Attach session provider to app layout.

## Acceptance

- [x] `next-auth`, Mongo adapter, and `mongodb` added.
- [x] `src/auth.ts` defines Google login + session callback (`session.user.id`).
- [x] `src/app/api/auth/[...nextauth]/route.ts` exports handlers.
- [x] Root layout includes session provider for client components.
