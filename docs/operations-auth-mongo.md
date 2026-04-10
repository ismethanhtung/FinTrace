# Operations: Auth + Mongo Setup Checklist

## Required Environment Variables

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `USER_SECRET_ENCRYPTION_KEY`

## Google OAuth Setup

1. Create OAuth client in Google Cloud Console.
2. Add callback URI:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `<APP_URL>/api/auth/callback/google`
3. Paste credentials to environment.

## Mongo Atlas Setup

1. Provision cluster and network access.
2. Create DB user with least privilege for app database.
3. Configure `MONGODB_URI` and `MONGODB_DB_NAME`.
4. Verify index bootstrap runs on first sign-in/API use.

## Rollback Guidance

- Disable auth entry points by removing OAuth env values.
- Keep user-data APIs returning 401 when auth unavailable.
- Preserve encrypted key records; do not attempt plaintext migration.
