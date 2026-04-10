import { NextResponse } from 'next/server';
import { getHuggingFaceKey } from '../../../../lib/getHuggingFaceKey';
import { apiError } from '../../../../lib/ai/apiError';
import { getUserApiKeyForProvider } from '../../../../lib/server/services/userAiKeyService';

const HUGGINGFACE_MODELS_URL = 'https://router.huggingface.co/v1/models';

function extractApiKey(req: Request): string | null {
  const h = req.headers.get('x-huggingface-api-key');
  if (h && h.trim()) return h.trim();

  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

export const runtime = 'nodejs';

export async function GET(request: Request) {
  let apiKey = extractApiKey(request);

  if (!apiKey) {
    apiKey = await getUserApiKeyForProvider('huggingface');
  }

  if (!apiKey) {
    try {
      apiKey = await getHuggingFaceKey();
    } catch {
      apiKey = null;
    }
  }

  if (!apiKey) {
    return apiError({
      providerId: 'huggingface',
      status: 401,
      error: 'Missing Hugging Face API key',
      code: 'MISSING_AUTH',
    });
  }

  const res = await fetch(HUGGINGFACE_MODELS_URL, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    return apiError({
      providerId: 'huggingface',
      status: res.status,
      error: `Hugging Face models error: ${res.status}`,
      details: errBody,
      code: 'UPSTREAM_ERROR',
    });
  }

  const json: unknown = await res.json();

  const rawData =
    (json as { data?: unknown }).data ??
    (json as { models?: unknown }).models ??
    (json as { items?: unknown }).items;

  const modelsRaw = Array.isArray(rawData) ? rawData : [];

  const safe = modelsRaw
    .filter((m: unknown): m is { id: string; name?: string } => {
      const rec = m as { id?: unknown };
      return typeof rec?.id === 'string' && rec.id.trim().length > 0;
    })
    .map((m) => ({ id: m.id, name: m.name }))
    .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));

  // Normalize to the same shape used by aiProviderService for OpenRouter/Groq
  return NextResponse.json({ data: safe }, { status: 200 });
}
