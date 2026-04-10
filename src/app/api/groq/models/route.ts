import { NextResponse } from 'next/server';
import { getGroqApiKey } from '../../../../lib/getGroqKey';
import { apiError } from '../../../../lib/ai/apiError';
import { getUserApiKeyForProvider } from '../../../../lib/server/services/userAiKeyService';

const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models';

function extractApiKey(req: Request): string | null {
  const h = req.headers.get('x-groq-api-key');
  if (h && h.trim()) return h.trim();
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

export const runtime = 'nodejs';

export async function GET(request: Request) {
  let apiKey = extractApiKey(request);
  if (!apiKey) {
    apiKey = await getUserApiKeyForProvider('groq');
  }
  if (!apiKey) {
    try {
      apiKey = await getGroqApiKey();
    } catch {
      apiKey = null;
    }
  }
  if (!apiKey) {
    return apiError({
      providerId: 'groq',
      status: 401,
      error: 'Missing Groq API key',
      code: 'MISSING_AUTH',
    });
  }

  const res = await fetch(GROQ_MODELS_URL, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    return apiError({
      providerId: 'groq',
      status: res.status,
      error: `Groq models error: ${res.status}`,
      details: errBody,
      code: 'UPSTREAM_ERROR',
    });
  }

  const json = await res.json();
  return NextResponse.json(json);
}
