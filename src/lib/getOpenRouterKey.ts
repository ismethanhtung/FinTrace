/**
 * Resolves the OpenRouter API key with priority:
 *   1. process.env.OPENROUTER_FALLBACK_API_KEY (local dev, .env.local)
 *   2. AWS Secrets Manager                    (production, when AWS_REGION is set)
 *
 * The AWS secret can be:
 *   - JSON: { "OPENROUTER_API_KEY": "sk-or-v1-..." }
 *   - or plain string containing the key directly.
 */

let _cachedKey: string | null = null;
let _cacheExpiry = 0;
const KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function normalizeCandidateKey(raw?: string | null): string | null {
  const value = raw?.trim() ?? '';
  if (!value) return null;

  const upperValue = value.toUpperCase();
  if (
    value.endsWith('...') ||
    upperValue.startsWith('MY_') ||
    upperValue.startsWith('YOUR_') ||
    upperValue.includes('PLACEHOLDER') ||
    upperValue.includes('CHANGEME')
  ) {
    return null;
  }

  return value;
}

export async function getOpenRouterApiKey(): Promise<string> {
  // 1. Fast path: environment variable (local dev or injected by CI/CD)
  const envKey = normalizeCandidateKey(process.env.OPENROUTER_FALLBACK_API_KEY);
  if (envKey) {
    return envKey;
  }

  // 2. Cached secret (avoid repeated AWS calls)
  if (_cachedKey && Date.now() < _cacheExpiry) {
    return _cachedKey;
  }

  // 3. AWS Secrets Manager (production)
  const secretName = process.env.OPENROUTER_SECRET_NAME || 'fintrace/openrouter-api-key';
  const region = process.env.AWS_REGION;

  if (!region) {
    throw new Error(
      'OPENROUTER_FALLBACK_API_KEY is not set and AWS_REGION is not configured. ' +
        'Set OPENROUTER_FALLBACK_API_KEY in your .env.local for local development.',
    );
  }

  try {
    const { SecretsManagerClient, GetSecretValueCommand } = await import(
      '@aws-sdk/client-secrets-manager'
    );
    const client = new SecretsManagerClient({ region });
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));

    const raw = response.SecretString;
    if (!raw) throw new Error('Empty secret string from AWS Secrets Manager');

    let key = '';
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      key =
        parsed.OPENROUTER_API_KEY ??
        parsed.OPENROUTER_FALLBACK_API_KEY ??
        parsed.openrouter_api_key ??
        parsed.openrouter_fallback_api_key ??
        Object.values(parsed)[0] ??
        '';
    } catch {
      key = raw.trim();
    }

    key = normalizeCandidateKey(key) ?? '';
    if (!key) throw new Error('Could not extract OpenRouter API key from secret');

    _cachedKey = key;
    _cacheExpiry = Date.now() + KEY_CACHE_TTL_MS;
    return key;
  } catch (err) {
    throw new Error(
      `Failed to retrieve OpenRouter API key from AWS Secrets Manager (secret: ${secretName}): ${String(err)}`,
    );
  }
}
