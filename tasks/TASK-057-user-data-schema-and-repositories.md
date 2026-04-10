# TASK-057: User Data Schema and Repositories

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Feature  
**Created:** 2026-04-09  
**Updated:** 2026-04-09  
**Assignee:** AI Agent

## Scope

- Define collections/indexes for favorites, pins, ai keys, preferences.
- Build repository layer with ownership boundary by `userId`.
- Add AES-GCM encryption helper for user AI keys.

## Acceptance

- [x] Index setup in DB bootstrap (`user_favorites`, `user_pins`, `user_ai_keys`, `user_preferences`).
- [x] Repository methods for list/upsert/delete by `userId`.
- [x] AI key storage encrypted (not plaintext).
