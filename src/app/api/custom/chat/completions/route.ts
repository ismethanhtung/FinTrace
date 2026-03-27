import { NextResponse } from 'next/server';
import { validateCustomBaseUrl } from '../../../../../lib/ai/customProviderUrl';
import { apiError } from '../../../../../lib/ai/apiError';

export const runtime = 'nodejs';

type Role = 'system' | 'user' | 'assistant';
type ChatMessage = { role: Role; content: string };

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

export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError({
      providerId,
      status: 400,
      error: 'Invalid JSON body',
      code: 'INVALID_JSON',
    });
  }

  const parsed = body as Partial<{
    model: string;
    messages: ChatMessage[];
    stream: boolean;
    max_tokens: number;
  }>;

  const model = typeof parsed.model === 'string' ? parsed.model : null;
  const messages = Array.isArray(parsed.messages) ? parsed.messages : null;
  const stream = parsed.stream === true;
  const maxTokens = typeof parsed.max_tokens === 'number' ? parsed.max_tokens : 2048;

  if (!model) return apiError({ providerId, status: 400, error: 'Missing model', code: 'MISSING_MODEL' });
  if (!messages || messages.length === 0) {
    return apiError({ providerId, status: 400, error: 'Missing messages', code: 'MISSING_MESSAGES' });
  }

  const upstreamUrl = new URL(validated.url.toString());
  upstreamUrl.pathname = `${upstreamUrl.pathname}/chat/completions`.replace(/\/{2,}/g, '/');

  const upstreamRes = await fetch(upstreamUrl.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      max_tokens: maxTokens,
    }),
  });

  if (!upstreamRes.ok) {
    const errBody = await upstreamRes.text().catch(() => '');
    return apiError({
      providerId,
      status: upstreamRes.status,
      error: `Custom provider chat error: ${upstreamRes.status}`,
      details: errBody,
      code: 'UPSTREAM_ERROR',
    });
  }

  if (stream) {
    if (!upstreamRes.body) {
      return apiError({
        providerId,
        status: 500,
        error: 'No response body for stream',
        code: 'NO_BODY',
      });
    }
    const headers = new Headers(upstreamRes.headers);
    headers.set('Content-Type', 'text/event-stream');
    headers.set('Cache-Control', 'no-cache, no-transform');
    return new Response(upstreamRes.body, { status: upstreamRes.status, headers });
  }

  const json = await upstreamRes.json();
  return NextResponse.json(json);
}

