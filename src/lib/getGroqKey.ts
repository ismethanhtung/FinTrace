/**
 * Resolves the Groq API key from environment variables.
 * Use Cloudflare secrets/vars in production.
 */

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

export async function getGroqApiKey(): Promise<string> {
  const envKey = normalizeCandidateKey(process.env.GROQ_API_KEY);
  if (envKey) return envKey;

  throw new Error(
    'GROQ_API_KEY is not set. Configure it in .env for local development or as a Cloudflare secret.',
  );
}
