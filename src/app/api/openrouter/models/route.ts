import { NextResponse } from 'next/server';
import { getOpenRouterApiKey } from '../../../../lib/getOpenRouterKey';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

function extractApiKeyFromHeaders(req: Request): string | null {
  const h1 = req.headers.get('x-openrouter-api-key');
  if (h1 && h1.trim()) return h1.trim();

  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const apiKeyFromUser = extractApiKeyFromHeaders(request);
    let apiKey = apiKeyFromUser;

    if (!apiKey) {
      try {
        apiKey = await getOpenRouterApiKey();
      } catch {
        apiKey = null;
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OpenRouter API key' },
        { status: 401 },
      );
    }

    const res = await fetch(OPENROUTER_MODELS_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `OpenRouter models error: ${res.status}`, details: errBody },
        { status: res.status },
      );
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch OpenRouter models' },
      { status: 500 },
    );
  }
}

