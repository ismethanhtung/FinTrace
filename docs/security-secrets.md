# Security and Secrets

## Encryption at Rest

User AI API keys are encrypted before DB write:

- Algorithm: AES-256-GCM
- Metadata stored per secret: `iv`, `tag`, `ciphertext`, `keyVersion`
- Master key source: `USER_SECRET_ENCRYPTION_KEY`

## Secret Handling Rules

- Never store plaintext user AI keys in DB.
- For authenticated users, local provider persistence strips `apiKey`.
- API logs should never include API key/secret values.

## Runtime Fallback Priority (Built-in Providers)

1. Request header key (explicit request)
2. Authenticated user key in DB
3. Platform key from env/AWS secret manager

## Rate Limiting

Sensitive endpoint guard:

- `PUT /api/user/ai-keys/:provider`
- `DELETE /api/user/ai-keys/:provider`

Current policy: in-memory per-user+client key throttle.
