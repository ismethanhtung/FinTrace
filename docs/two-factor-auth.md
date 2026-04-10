# Two-Factor Authentication (Google Authenticator Compatible)

## Overview
FinTrace now supports TOTP-based 2FA. Users can enable it from Settings and must enter a valid 6-digit code after login before using the app.

## UX Flow
1. Open `Settings -> Security`.
2. Click **Set up Google Authenticator**.
3. Scan QR code in Google Authenticator (or compatible app) and submit a 6-digit code.
4. 2FA becomes enabled.
5. On subsequent logins, user sees a verification gate and must submit a valid 6-digit code.

## Technical Design

### Persistence
Collection: `user_two_factor`

Fields:
- `userId` (unique)
- `enabled`
- `secret`
- `pendingSecret`
- `pendingSetupExpiresAt`
- `enabledAt`
- timestamps

### Security Controls
- TOTP verification via `otplib`.
- QR generation via `qrcode`.
- Login-verified state stored in HTTP-only cookie (`ft_2fa_verified`).
- Cookie value is HMAC-signed using `AUTH_SECRET`, includes `userId` and expiry.

### Endpoints
- `GET /api/auth/2fa`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/enable`
- `POST /api/auth/2fa/disable`
- `POST /api/auth/2fa/verify-login`

## Operational Notes
- Setup QR/secret expires after 10 minutes.
- Login verification cookie expires after 30 days.
- If cookie is missing/invalid and 2FA is enabled, app renders login verification gate.

## Future Hardening
- Encrypt `secret` and `pendingSecret` at rest.
- Add backup/recovery codes.
- Add rate limiting for 2FA verification endpoints.
- Add security audit log entries for enable/disable/verify attempts.

