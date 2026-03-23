const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ORModel = {
  id: string;
  name: string;
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
    const res = await fetch(`${OPENROUTER_BASE}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`OpenRouter models error: ${res.status}`);
    const json = await res.json();
    const models: ORModel[] = json.data ?? [];
    // Filter to text/chat-capable only and sort by name
    return models
      .filter(m => m.id && !m.id.includes(':free') === false || m.id)
      .sort((a, b) => a.name.localeCompare(b.name));
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
    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fintrace.app',
        'X-Title': 'FinTrace AI',
      },
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
    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fintrace.app',
        'X-Title': 'FinTrace AI',
      },
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
