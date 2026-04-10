# TASK-064: Google Authenticator 2FA for Settings + Login Gate

## Goal
- Implement real 2-step verification using TOTP (Google Authenticator compatible).
- Manage setup/enable/disable in Settings.
- Enforce extra verification after login when 2FA is enabled.

## Scope
- Added `user_two_factor` persistence for per-user 2FA state.
- Added TOTP + QR setup flow and verification APIs.
- Added login verification gate that blocks app content until a valid 2FA code is provided.
- Replaced placeholder Security UI with real actionable 2FA UI.
- Added i18n strings (EN/VI).

## API Endpoints
- `GET /api/auth/2fa` -> read enabled status.
- `POST /api/auth/2fa/setup` -> generate pending secret + QR.
- `POST /api/auth/2fa/enable` -> verify code and enable.
- `POST /api/auth/2fa/disable` -> verify code and disable.
- `POST /api/auth/2fa/verify-login` -> verify login challenge and set trusted cookie.

## Data Model
- Collection: `user_two_factor`
- Fields:
  - `userId: string` (unique)
  - `enabled: boolean`
  - `secret?: string`
  - `pendingSecret?: string`
  - `pendingSetupExpiresAt?: Date`
  - `enabledAt?: Date`
  - `updatedAt: Date`
  - `createdAt: Date`

## Notes
- Current implementation stores TOTP secret directly in DB; can be upgraded later to encrypted-at-rest.
- Login challenge cookie is HMAC-signed and scoped to user + expiry.
- Setup session TTL is 10 minutes.

## Next Improvements
- Add recovery codes.
- Add “remember this device” with stricter device-bound signature.
- Add audit trail for 2FA changes (enabled/disabled/failed attempts).

