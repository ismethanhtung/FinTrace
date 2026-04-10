# TASK-063: Session Revocation and Account Deletion

**Status:** [x] Draft | [ ] In Progress | [ ] Done | [ ] Blocked  
**Priority:** High  
**Type:** Security/Backend/Frontend  
**Created:** 2026-04-10  
**Updated:** 2026-04-10  
**Assignee:** AI Agent

## Context

Settings UI already shows:
- "Log out all devices"
- "Delete account"

But both actions are currently UI-only and not implemented end-to-end.

## Objectives

1. Implement **log out all other active sessions** (keep current session alive by default).
2. Implement **secure account deletion** (hard delete user-owned data, revoke sessions, sign out).
3. Keep behavior aligned with Auth.js + MongoDB adapter and existing user-data collections.

## Non-Goals

- No soft-delete/user recovery in this task.
- No GDPR export workflow changes (covered by separate tasks).
- No admin moderation dashboard.

## Current Architecture Notes

- Auth: Auth.js with MongoDB adapter.
- Session strategy: `database`.
- User data collections currently include:
  - `user_preferences`
  - `user_ai_keys`
  - `user_favorites`
  - `user_pins`
- Auth adapter collections (Auth.js default):
  - `users`
  - `accounts`
  - `sessions`
  - `verification_tokens`

## Functional Requirements

### A) Log Out All Other Devices

- Triggered from Settings -> Account Security.
- Must revoke all sessions of current user **except current session token**.
- Must be idempotent.
- Response must include count of revoked sessions.
- Current device remains authenticated.

### B) Delete Account

- Requires explicit confirmation step in UI (type-to-confirm string, e.g. `DELETE`).
- Requires recent authentication check:
  - Either re-auth if session age exceeds threshold (recommended 10 minutes),
  - Or additional confirmation path (minimum: CSRF-protected POST + authenticated session).
- Deletes all user-owned domain data.
- Deletes auth identity records (`accounts`, `sessions`, then `users`).
- Ends current session and redirects to home page signed out state.
- Must emit audit logs.

## API Design

### 1) `POST /api/auth/sessions/revoke-others`

Auth required.

Request body:
```json
{}
```

Response:
```json
{
  "ok": true,
  "revokedCount": 3
}
```

Server logic:
- Resolve current user.
- Read current session token from Auth.js cookie.
- Delete all `sessions` docs where `userId = currentUserId` and `sessionToken != currentToken`.

### 2) `POST /api/user/account/delete`

Auth required.

Request body:
```json
{
  "confirmation": "DELETE"
}
```

Response:
```json
{
  "ok": true
}
```

Server transaction-like sequence (ordered, safe):
1. Validate auth and confirmation payload.
2. Delete user domain collections by `userId`.
3. Delete Auth.js `accounts` by `userId`.
4. Delete Auth.js `sessions` by `userId`.
5. Delete Auth.js `users` by `_id`.
6. Return success; frontend calls `signOut({ callbackUrl: "/" })`.

If full Mongo transaction is available (replica set), run inside transaction.  
If not, perform ordered deletes + audit and return deterministic error handling.

## Data & Index Requirements

- Ensure index on `sessions.userId` for fast revocation.
- Existing indexes for user collections should already include `userId`; verify and add if missing.
- Validate that `userId` type used in app repos matches Auth.js adapter `_id` string mapping.

## Security Requirements

- CSRF-protected state-changing endpoints.
- Rate limit both endpoints (per user + client key).
- Structured audit logs:
  - `user_sessions_revoke_others`
  - `user_account_delete`
- Do not leak internal DB error details to clients.
- Add protective guard against deleting wrong user (strict filter by authenticated `userId` only).

## Frontend Requirements

### Settings -> Log out all
- Replace placeholder button with async action.
- Show loading state, success toast with revoked count, and error toast.

### Settings -> Delete account
- Add confirmation modal:
  - warning copy
  - typed confirmation input
  - destructive action button disabled until valid input
- On success: sign out + redirect `/`.

## Testing Plan

### Unit
- Session revocation service:
  - revokes others, keeps current.
  - returns correct count.
- Account deletion service:
  - deletes all target collections with correct user scope.

### Integration (API)
- `revoke-others`:
  - 401 when unauthenticated.
  - 200 + count when authenticated.
- `account/delete`:
  - 401 unauthenticated.
  - 422 invalid confirmation.
  - 200 success and subsequent auth/session invalid.

### Regression
- Existing login/logout flow remains stable.
- User preferences/keys not leaked across users.
- After delete, re-login creates fresh clean user state.

## Rollout Plan

1. Ship backend endpoints behind internal feature flag (optional).
2. Enable UI actions in settings.
3. Monitor logs for:
   - delete failures
   - session revoke anomalies
4. Add ops runbook snippet for support handling user deletion requests.

## Acceptance Criteria

- [ ] Clicking "Log out all" revokes all other sessions and keeps current session active.
- [ ] Clicking "Delete account" (after confirmation) removes account + user data and signs user out.
- [ ] API endpoints are authenticated, rate-limited, and audited.
- [ ] Tests cover success + failure cases.
- [ ] No hardcoded/mock behavior remains for these two actions in settings.

