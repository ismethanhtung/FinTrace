# TASK-061: Security Hardening + Observability

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Security  
**Created:** 2026-04-09  
**Updated:** 2026-04-09  
**Assignee:** AI Agent

## Scope

- Encrypt user API keys at rest.
- Add basic audit log helper with redaction.
- Add minimal rate limiting for sensitive endpoints.
- Update provider proxy routes to use user-level server-side key fallback.

## Acceptance

- [x] AI keys stored encrypted via AES-GCM.
- [x] Audit logs added for key set/delete.
- [x] Rate limit guard added for ai-key write/delete endpoints.
- [x] OpenRouter/Groq/HuggingFace routes now check user key (server) before platform key.
