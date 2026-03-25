export type AIModelOption = {
  id: string;
  name?: string;
};

export const DEFAULT_MODEL_BY_PROVIDER: Record<string, string> = {
  openrouter: 'arcee-ai/trinity-large-preview:free',
  groq: 'llama-3.3-70b-versatile',
  // Hugging Face Inference Providers (router) OpenAI-compatible Chat Completions
  huggingface: 'openai/gpt-oss-120b:cerebras',
};

const FALLBACK_OPENROUTER_MODELS: AIModelOption[] = [
  {
    id: 'arcee-ai/trinity-large-preview:free',
    name: 'Arcee Trinity Large (Free)',
  },
  { id: 'google/gemini-2.0-flash-lite-001', name: 'Gemini 2.0 Flash Lite' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct' },
  { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B Instruct' },
];

const FALLBACK_GROQ_MODELS: AIModelOption[] = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
  { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B' },
  { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B' },
];

const FALLBACK_HUGGINGFACE_MODELS: AIModelOption[] = [
  { id: 'openai/gpt-oss-120b:cerebras', name: 'gpt-oss 120B (cerebras)' },
  { id: 'openai/gpt-oss-120b:fireworks-ai', name: 'gpt-oss 120B (fireworks-ai)' },
  { id: 'openai/gpt-oss-20b:cerebras', name: 'gpt-oss 20B (cerebras)' },
];

export function getDefaultModelForProvider(providerId: string): string {
  return DEFAULT_MODEL_BY_PROVIDER[providerId] ?? DEFAULT_MODEL_BY_PROVIDER.openrouter;
}

export function getFallbackModelsForProvider(providerId: string): AIModelOption[] {
  switch (providerId) {
    case 'groq':
      return FALLBACK_GROQ_MODELS;
    case 'huggingface':
      return FALLBACK_HUGGINGFACE_MODELS;
    case 'openrouter':
    default:
      return FALLBACK_OPENROUTER_MODELS;
  }
}
