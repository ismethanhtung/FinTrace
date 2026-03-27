/**
 * Unified AI provider service.
 * Routes chat requests to the correct Next.js proxy based on provider config.
 */

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ModelInfo = {
  id: string;
  name?: string;
};

export type ProviderRuntimeConfig = {
  id: string;
  apiKey: string;
  baseUrl?: string;
};

type AiServiceErrorPayload = {
  providerId: string;
  status: number;
  message: string;
  details?: string;
  code?: string;
};

export class AIProviderServiceError extends Error {
  providerId: string;
  status: number;
  details?: string;
  code?: string;

  constructor(payload: AiServiceErrorPayload) {
    super(`[${payload.providerId}] ${payload.message}`);
    this.name = 'AIProviderServiceError';
    this.providerId = payload.providerId;
    this.status = payload.status;
    this.details = payload.details;
    this.code = payload.code;
  }
}

function getProxyBase(config: ProviderRuntimeConfig): string {
  const providerId = config.id;
  switch (providerId) {
    case 'openrouter':
      return '/api/openrouter';
    case 'groq':
      return '/api/groq';
    case 'huggingface':
      return '/api/huggingface';
    default:
      if (!config.baseUrl?.trim()) {
        throw new AIProviderServiceError({
          providerId,
          status: 400,
          message: `Unsupported provider "${providerId}": missing custom baseUrl`,
          code: 'UNSUPPORTED_PROVIDER',
        });
      }
      return '/api/custom';
  }
}

function buildHeaders(config: ProviderRuntimeConfig): Record<string, string> {
  const providerId = config.id;
  const apiKey = config.apiKey;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  headers['x-ai-provider-id'] = providerId;
  if (providerId !== 'openrouter' && providerId !== 'groq' && providerId !== 'huggingface') {
    headers['x-ai-provider-base-url'] = config.baseUrl?.trim() ?? '';
  }
  if (!apiKey?.trim()) {
    return headers;
  }

  switch (providerId) {
    case 'openrouter':
      headers['x-openrouter-api-key'] = apiKey.trim();
      break;
    case 'groq':
      headers['x-groq-api-key'] = apiKey.trim();
      break;
    case 'huggingface':
      // Hugging Face router expects OpenAI-compatible Authorization header:
      //   Authorization: Bearer hf_...
      headers['authorization'] = `Bearer ${apiKey.trim()}`;
      break;
    default:
      // Generic OpenAI-compatible providers should use Bearer auth.
      headers['authorization'] = `Bearer ${apiKey.trim()}`;
  }
  return headers;
}

async function parseErrorResponse(res: Response, providerId: string): Promise<AIProviderServiceError> {
  const bodyText = await res.text().catch(() => '');
  let message = `Request failed with status ${res.status}`;
  let details = bodyText;
  let code: string | undefined;
  try {
    const parsed = JSON.parse(bodyText) as { error?: unknown; details?: unknown; code?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      message = parsed.error;
    }
    if (typeof parsed.details === 'string' && parsed.details.trim()) {
      details = parsed.details;
    }
    if (typeof parsed.code === 'string' && parsed.code.trim()) {
      code = parsed.code;
    }
  } catch {
    // Keep raw text as details
  }
  return new AIProviderServiceError({
    providerId,
    status: res.status,
    message,
    details,
    code,
  });
}

// ─── Model listing ────────────────────────────────────────────────────────────

async function getModels(config: ProviderRuntimeConfig): Promise<ModelInfo[]> {
  const base = getProxyBase(config);

  const headers = buildHeaders(config);

  const res = await fetch(`${base}/models`, { headers });
  if (!res.ok) {
    // 401/403: thiếu hoặc sai khóa — không throw để UI dùng model dự phòng / Settings
    if (res.status === 401 || res.status === 403) {
      console.warn(
        `[aiProvider] ${config.id} /models: ${res.status} — kiểm tra API key trong Settings`,
      );
      return [];
    }
    throw await parseErrorResponse(res, config.id);
  }

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
  config: ProviderRuntimeConfig,
  model: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const base = getProxyBase(config);
  const headers = buildHeaders(config);

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, stream: true, max_tokens: 2048 }),
    signal,
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, config.id);
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
  config: ProviderRuntimeConfig,
  model: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const base = getProxyBase(config);
  const headers = buildHeaders(config);

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, stream: false, max_tokens: 2048 }),
    signal,
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, config.id);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

export const aiProviderService = {
  getModels: (providerId: string, apiKey: string, baseUrl?: string) =>
    getModels({ id: providerId, apiKey, baseUrl }),
  chatStream: (
    providerId: string,
    apiKey: string,
    baseUrl: string | undefined,
    model: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ) => chatStream({ id: providerId, apiKey, baseUrl }, model, messages, onChunk, signal),
  chat: (
    providerId: string,
    apiKey: string,
    baseUrl: string | undefined,
    model: string,
    messages: ChatMessage[],
    signal?: AbortSignal,
  ) => chat({ id: providerId, apiKey, baseUrl }, model, messages, signal),
};
