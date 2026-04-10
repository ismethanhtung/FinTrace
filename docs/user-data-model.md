# User Data Model (MongoDB)

## Collections

### `user_preferences`

- Unique key: `userId`
- Fields:
  - `font`, `theme`, `activeProviderId`
  - `providerModels`
  - `systemPrompt`
  - `cryptoPanicApiKey`
  - `providers` (without plaintext API keys)
  - `createdAt`, `updatedAt`

### `user_favorites`

- Unique key: `(userId, universe, symbol)`
- Fields:
  - `userId`, `universe`, `symbol`
  - `createdAt`, `updatedAt`

### `user_pins`

- Unique key: `(userId, pinType, pinKey)`
- Fields:
  - `userId`, `pinType`, `pinKey`
  - `label`, `payload`
  - `createdAt`, `updatedAt`

### `user_ai_keys`

- Unique key: `(userId, providerId)`
- Fields:
  - `userId`, `providerId`
  - `keyVersion`, `iv`, `tag`, `ciphertext`
  - `createdAt`, `updatedAt`

## Ownership Rule

Every repository/API query includes `userId` as part of filter criteria.
Cross-user access is never supported.

## Sync Policy

- Guest mode: local storage fallback.
- Authenticated mode: server-first state.
- Conflict strategy: last write wins (`updatedAt`).
