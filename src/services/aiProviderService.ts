/**
 * Unified AI provider service.
 * Routes chat requests to the correct Next.js proxy based on providerId.
 * Adding a new provider = add a case in getProxyBase + a /api/<provider> route.
 */

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ModelInfo = {
  id: string;
  name?: string;
};

// ─── Routing ──────────────────────────────────────────────────────────────────

function getProxyBase(providerId: string): string {
  switch (providerId) {
    case 'openrouter':
      return '/api/openrouter';
    case 'groq':
      return '/api/groq';
    default:
      // Custom providers fall back to openrouter proxy (user manages routing externally)
      return '/api/openrouter';
  }
}

function buildHeaders(providerId: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!apiKey?.trim()) return headers;

  switch (providerId) {
    case 'openrouter':
      headers['x-openrouter-api-key'] = apiKey.trim();
      break;
    case 'groq':
      headers['x-groq-api-key'] = apiKey.trim();
      break;
    default:
      headers['x-openrouter-api-key'] = apiKey.trim();
  }
  return headers;
}

// ─── Model listing ────────────────────────────────────────────────────────────

async function getModels(providerId: string, apiKey: string): Promise<ModelInfo[]> {
  const base = getProxyBase(providerId);
  const headers = buildHeaders(providerId, apiKey);

  const res = await fetch(`${base}/models`, { headers });
  if (!res.ok) throw new Error(`[${providerId}] models error: ${res.status}`);

  const json: unknown = await res.json();

  // Both OpenRouter and Groq return { data: [...] }
  const rawData = (json as { data?: unknown }).data;
  const modelsRaw = Array.isArray(rawData) ? rawData : [];

  const safe = modelsRaw.filter((m: unknown): m is ModelInfo => {
    const rec = m as { id?: unknown };
    return typeof rec?.id === 'string' && rec.id.trim().length > 0;
  });

  return safe
    .map((m) => ({ id: m.id, name: (m as { id: string; name?: string }).name }))
    .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
}

// ─── Streaming chat ───────────────────────────────────────────────────────────

async function chatStream(
  providerId: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const base = getProxyBase(providerId);
  const headers = buildHeaders(providerId, apiKey);

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, stream: true, max_tokens: 2048 }),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`[${providerId}] stream error ${res.status}: ${errBody}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

// ─── Non-streaming chat ───────────────────────────────────────────────────────

async function chat(
  providerId: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const base = getProxyBase(providerId);
  const headers = buildHeaders(providerId, apiKey);

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, stream: false, max_tokens: 2048 }),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`[${providerId}] chat error ${res.status}: ${errBody}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

export const aiProviderService = { getModels, chatStream, chat };
