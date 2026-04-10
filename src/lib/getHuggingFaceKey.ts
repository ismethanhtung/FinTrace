/**
 * Resolves the Hugging Face token used for Inference Providers.
 *
 * Priority:
 *  1. process.env.HUGGINGFACE_FALLBACK_API_KEY / process.env.HUGGINGFACE_API_KEY / process.env.HF_TOKEN
 *
 * Use environment secrets/vars in production.
 */

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
  const envKey =
    normalizeCandidateKey(
      process.env.HUGGINGFACE_FALLBACK_API_KEY ||
        process.env.HUGGINGFACE_API_KEY ||
        process.env.HF_FALLBACK_API_KEY ||
        process.env.HF_TOKEN,
    ) ?? null;
  if (envKey) return envKey;

  throw new Error(
    "HUGGINGFACE_FALLBACK_API_KEY is not set. Configure it in .env for local development or as an environment secret.",
  );
}
