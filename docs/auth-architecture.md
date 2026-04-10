# Auth Architecture (Google + MongoDB)

## Overview

FinTrace now uses **Auth.js** with **Google OAuth** and MongoDB-backed sessions.

- Provider: Google (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- Session strategy: `database`
- Session identity: `session.user.id`
- Entry route: `/api/auth/[...nextauth]`

## Boundaries

- Guest users can browse market/board/news features.
- Authenticated users can persist account-bound data:
  - favorites
  - pins
  - AI provider keys
  - app-level preferences

## Server Flow

1. Client triggers `signIn("google")`.
2. Auth.js stores user/account/session in MongoDB via adapter.
3. App reads identity via `auth()` on server routes.
4. User-data APIs enforce per-user ownership through `userId`.

## Middleware and Guards

- Middleware remains focused on locale/universe routing.
- Data protection is done at API layer (`401` if no session).
- Sensitive write endpoints include basic rate limiting.
