import { NextResponse } from 'next/server';

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
  const apiKey = extractApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  const res = await fetch(GROQ_MODELS_URL, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    return NextResponse.json(
      { error: `Groq models error: ${res.status}`, details: errBody },
      { status: res.status },
    );
  }

  const json = await res.json();
  return NextResponse.json(json);
}
