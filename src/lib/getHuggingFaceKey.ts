/**
 * Resolves the Hugging Face token used for Inference Providers.
 *
 * Priority:
 *  1. process.env.HUGGINGFACE_FALLBACK_API_KEY / process.env.HUGGINGFACE_API_KEY / process.env.HF_TOKEN
 *  2. AWS Secrets Manager (production when AWS_REGION is set)
 *
 * The AWS secret can be:
 *   - JSON: { "HUGGINGFACE_API_KEY": "hf_..." }
 *   - or plain text containing the key directly.
 */

let _cachedKey: string | null = null;
let _cacheExpiry = 0;
const KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function normalizeCandidateKey(raw?: string | null): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;

  const upperValue = value.toUpperCase();
  if (
    value.endsWith("...") ||
    upperValue.startsWith("MY_") ||
    upperValue.startsWith("YOUR_") ||
    upperValue.includes("PLACEHOLDER") ||
    upperValue.includes("CHANGEME")
  ) {
    return null;
  }

  return value;
}

export async function getHuggingFaceKey(): Promise<string> {
  // 1. Fast path: env var
  const envKey =
    normalizeCandidateKey(
      process.env.HUGGINGFACE_FALLBACK_API_KEY ||
        process.env.HUGGINGFACE_API_KEY ||
        process.env.HF_FALLBACK_API_KEY ||
        process.env.HF_TOKEN,
    ) ?? null;
  if (envKey) return envKey;

  // 2. Cached
  if (_cachedKey && Date.now() < _cacheExpiry) return _cachedKey;

  // 3. AWS Secrets Manager
  const secretName =
    process.env.HUGGINGFACE_SECRET_NAME || "fintrace/huggingface-api-key";
  const region = process.env.AWS_REGION;

  if (!region) {
    throw new Error(
      "HUGGINGFACE_FALLBACK_API_KEY is not set and AWS_REGION is not configured. " +
        "Set HUGGINGFACE_FALLBACK_API_KEY in your .env.local for local development.",
    );
  }

  try {
    const { SecretsManagerClient, GetSecretValueCommand } = await import(
      "@aws-sdk/client-secrets-manager"
    );
    const client = new SecretsManagerClient({ region });
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName }),
    );

    const raw = response.SecretString;
    if (!raw)
      throw new Error("Empty secret string from AWS Secrets Manager");

    let key = "";
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      key =
        parsed.HUGGINGFACE_API_KEY ??
        parsed.huggingface_api_key ??
        parsed.HF_TOKEN ??
        parsed.hf_token ??
        Object.values(parsed)[0] ??
        "";
    } catch {
      // Plain string
      key = raw.trim();
    }

    key = normalizeCandidateKey(key) ?? "";
    if (!key) throw new Error("Could not extract Hugging Face API key");

    _cachedKey = key;
    _cacheExpiry = Date.now() + KEY_CACHE_TTL_MS;
    return key;
  } catch (err) {
    throw new Error(
      `Failed to retrieve Hugging Face API key from AWS Secrets Manager (secret: ${secretName}): ${String(
        err,
      )}`,
    );
  }
}

