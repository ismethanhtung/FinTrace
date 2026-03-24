/**
 * Resolves the Groq API key with priority:
 *   1. process.env.GROQ_API_KEY  (local dev, .env.local)
 *   2. AWS Secrets Manager       (production, when AWS_REGION is set)
 *
 * The AWS secret is expected to be a JSON string like:
 *   { "GROQ_API_KEY": "gsk_..." }
 * or a plain string containing the key directly.
 */

let _cachedKey: string | null = null;
let _cacheExpiry = 0;
const KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getGroqApiKey(): Promise<string> {
  // 1. Fast path: environment variable (local dev or injected by CI/CD)
  if (process.env.GROQ_API_KEY) {
    return process.env.GROQ_API_KEY;
  }

  // 2. Cached secret (avoid repeated AWS calls)
  if (_cachedKey && Date.now() < _cacheExpiry) {
    return _cachedKey;
  }

  // 3. AWS Secrets Manager (production)
  const secretName = process.env.GROQ_SECRET_NAME || 'fintrace/groq-api-key';
  const region = process.env.AWS_REGION;

  if (!region) {
    throw new Error(
      'GROQ_API_KEY is not set and AWS_REGION is not configured. ' +
        'Set GROQ_API_KEY in your .env.local for local development.',
    );
  }

  try {
    const { SecretsManagerClient, GetSecretValueCommand } = await import(
      '@aws-sdk/client-secrets-manager'
    );
    const client = new SecretsManagerClient({ region });
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName }),
    );

    const raw = response.SecretString;
    if (!raw) throw new Error('Empty secret string from AWS Secrets Manager');

    let key: string;
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      key = parsed.GROQ_API_KEY ?? parsed.groq_api_key ?? Object.values(parsed)[0];
    } catch {
      // Plain text secret
      key = raw.trim();
    }

    if (!key) throw new Error('Could not extract Groq API key from secret');

    _cachedKey = key;
    _cacheExpiry = Date.now() + KEY_CACHE_TTL_MS;
    return key;
  } catch (err) {
    throw new Error(
      `Failed to retrieve Groq API key from AWS Secrets Manager (secret: ${secretName}): ${String(err)}`,
    );
  }
}
