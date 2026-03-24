import { aiProviderService } from './aiProviderService';

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
    return aiProviderService.getModels('openrouter', apiKey);
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
    return aiProviderService.chat('openrouter', apiKey, model, messages, signal);
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
    return aiProviderService.chatStream(
      'openrouter',
      apiKey,
      model,
      messages,
      onChunk,
      signal,
    );
  },
};
