const OPENROUTER_PROXY_BASE = '/api/openrouter';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ORModel = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;   // price per 1M tokens (string USD)
    completion: string;
  };
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// ─── Service ──────────────────────────────────────────────────────────────────
export const openrouterService = {
  /**
   * Fetch available models from OpenRouter.
   * Returns a filtered, sorted list of chat-capable models.
   */
  async getModels(apiKey: string): Promise<ORModel[]> {
    const headers: Record<string, string> = {};
    if (apiKey && apiKey.trim()) headers['x-openrouter-api-key'] = apiKey.trim();

    const res = await fetch(`${OPENROUTER_PROXY_BASE}/models`, {
      headers: {
        ...headers,
      },
    });
    if (!res.ok) throw new Error(`OpenRouter models error: ${res.status}`);
    const json: unknown = await res.json();
    const rawData = (json as { data?: unknown }).data;
    const modelsRaw = Array.isArray(rawData) ? rawData : [];

    // Sort by name (fallback to id)
    const safeModels = modelsRaw.filter((m: unknown): m is ORModel => {
      const rec = m as { id?: unknown; name?: unknown };
      return typeof rec?.id === 'string' && rec.id.trim().length > 0;
    });

    return safeModels.sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
  },

  /**
   * Send a non-streaming chat completion request.
   */
  async chat(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    signal?: AbortSignal,
  ): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey && apiKey.trim()) headers['x-openrouter-api-key'] = apiKey.trim();

    const res = await fetch(`${OPENROUTER_PROXY_BASE}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        max_tokens: 2048,
      }),
      signal,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`OpenRouter chat error ${res.status}: ${errBody}`);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? '';
  },

  /**
   * Send a streaming chat completion request.
   * Calls `onChunk(text)` for each SSE delta, resolves with the full text.
   */
  async chatStream(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey && apiKey.trim()) headers['x-openrouter-api-key'] = apiKey.trim();

    const res = await fetch(`${OPENROUTER_PROXY_BASE}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: 2048,
      }),
      signal,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`OpenRouter stream error ${res.status}: ${errBody}`);
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
        buffer = lines.pop() ?? ''; // keep partial line

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
  },
};
