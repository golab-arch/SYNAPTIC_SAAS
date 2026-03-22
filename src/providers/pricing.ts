/**
 * Static pricing table — USD per million tokens.
 * OpenRouter returns pricing dynamically — NOT duplicated here.
 * Updated: 2026-03-21
 */

export const PROVIDER_PRICING: Record<string, Record<string, { input: number; output: number }>> = {
  anthropic: {
    'claude-opus-4-6': { input: 15, output: 75 },
    'claude-sonnet-4-6': { input: 3, output: 15 },
    'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
    // Legacy
    'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
    'claude-opus-4-5-20251101': { input: 5, output: 25 },
    'claude-sonnet-4-20250514': { input: 3, output: 15 },
    'claude-opus-4-20250514': { input: 15, output: 75 },
  },
  openai: {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'o1': { input: 15, output: 60 },
    'o1-mini': { input: 3, output: 12 },
    'o3-mini': { input: 1.1, output: 4.4 },
    'o4-mini': { input: 1.1, output: 4.4 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-4-turbo-preview': { input: 10, output: 30 },
    'chatgpt-4o-latest': { input: 5, output: 15 },
  },
  gemini: {
    'gemini-2.5-flash': { input: 0.15, output: 0.6 },
    'gemini-2.5-pro': { input: 1.25, output: 10 },
    'gemini-2.0-flash': { input: 0.1, output: 0.4 },
    'gemini-1.5-pro': { input: 1.25, output: 5 },
    'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  },
};

/**
 * OpenAI model info — the /v1/models endpoint returns NOTHING useful.
 * We must maintain context windows + capabilities here.
 */
export const OPENAI_MODEL_INFO: Record<string, {
  name: string;
  contextWindow: number;
  maxOutput: number;
  supportsTools: boolean;
  supportsVision: boolean;
}> = {
  'gpt-4o': { name: 'GPT-4o', contextWindow: 128_000, maxOutput: 16_384, supportsTools: true, supportsVision: true },
  'gpt-4o-mini': { name: 'GPT-4o Mini', contextWindow: 128_000, maxOutput: 16_384, supportsTools: true, supportsVision: true },
  'o1': { name: 'o1', contextWindow: 200_000, maxOutput: 100_000, supportsTools: false, supportsVision: true },
  'o1-mini': { name: 'o1 Mini', contextWindow: 128_000, maxOutput: 65_536, supportsTools: false, supportsVision: false },
  'o3-mini': { name: 'o3 Mini', contextWindow: 200_000, maxOutput: 100_000, supportsTools: true, supportsVision: false },
  'o4-mini': { name: 'o4 Mini', contextWindow: 200_000, maxOutput: 100_000, supportsTools: true, supportsVision: true },
  'gpt-4-turbo': { name: 'GPT-4 Turbo', contextWindow: 128_000, maxOutput: 4_096, supportsTools: true, supportsVision: true },
  'gpt-4-turbo-preview': { name: 'GPT-4 Turbo Preview', contextWindow: 128_000, maxOutput: 4_096, supportsTools: true, supportsVision: false },
  'chatgpt-4o-latest': { name: 'ChatGPT-4o', contextWindow: 128_000, maxOutput: 16_384, supportsTools: true, supportsVision: true },
};
