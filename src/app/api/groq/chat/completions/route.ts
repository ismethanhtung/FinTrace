import { NextResponse } from 'next/server';
import { getGroqApiKey } from '../../../../../lib/getGroqKey';
import { apiError } from '../../../../../lib/ai/apiError';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

type Role = 'system' | 'user' | 'assistant';
type ChatMessage = { role: Role; content: string };

function extractApiKey(req: Request): string | null {
  const h = req.headers.get('x-groq-api-key');
  if (h && h.trim()) return h.trim();
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
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

  if (!model) return NextResponse.json({ error: 'Missing model' }, { status: 400 });
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
  }

  let apiKey = extractApiKey(request);
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

  const upstreamRes = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, stream, max_tokens: maxTokens }),
  });

  if (!upstreamRes.ok) {
    const errBody = await upstreamRes.text().catch(() => '');
    return apiError({
      providerId: 'groq',
      status: upstreamRes.status,
      error: `Groq chat error: ${upstreamRes.status}`,
      details: errBody,
      code: 'UPSTREAM_ERROR',
    });
  }

  if (stream) {
    if (!upstreamRes.body) {
      return NextResponse.json({ error: 'No response body for stream' }, { status: 500 });
    }
    const headers = new Headers(upstreamRes.headers);
    headers.set('Content-Type', 'text/event-stream');
    headers.set('Cache-Control', 'no-cache, no-transform');
    return new Response(upstreamRes.body, { status: upstreamRes.status, headers });
  }

  const json = await upstreamRes.json();
  return NextResponse.json(json);
}
