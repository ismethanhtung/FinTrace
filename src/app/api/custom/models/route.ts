import { NextResponse } from 'next/server';
import { validateCustomBaseUrl } from '../../../../lib/ai/customProviderUrl';
import { apiError } from '../../../../lib/ai/apiError';


function getProviderId(req: Request): string {
  return (req.headers.get('x-ai-provider-id') || 'custom').trim() || 'custom';
}

function getBaseUrl(req: Request): string {
  return (req.headers.get('x-ai-provider-base-url') || '').trim();
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

export async function GET(request: Request) {
  const providerId = getProviderId(request);
  const baseUrl = getBaseUrl(request);
  const validated = validateCustomBaseUrl(baseUrl);
  if (validated.ok === false) {
    return apiError({
      providerId,
      status: 400,
      error: `Invalid custom provider baseUrl: ${validated.reason}`,
      code: 'INVALID_BASE_URL',
    });
  }

  const apiKey = extractBearer(request);
  if (!apiKey) {
    return apiError({
      providerId,
      status: 401,
      error: 'Missing Authorization header',
      code: 'MISSING_AUTH',
    });
  }

  const upstreamUrl = new URL(validated.url.toString());
  upstreamUrl.pathname = `${upstreamUrl.pathname}/models`.replace(/\/{2,}/g, '/');

  const res = await fetch(upstreamUrl.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    return apiError({
      providerId,
      status: res.status,
      error: `Custom provider models error: ${res.status}`,
      details: errBody,
      code: 'UPSTREAM_ERROR',
    });
  }

  // Expect OpenAI-compatible { data: [...] } models list.
  const json: unknown = await res.json();
  return NextResponse.json(json, { status: 200 });
}

