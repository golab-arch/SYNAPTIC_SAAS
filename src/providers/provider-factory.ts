/**
 * Factory for instantiating LLM providers by name.
 */

import type { ILLMProvider } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { GeminiProvider } from './gemini.js';
import { OpenRouterProvider } from './openrouter.js';

export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'openrouter';

const PROVIDER_REGISTRY: Record<string, new (apiKey: string) => ILLMProvider> = {
  anthropic: AnthropicProvider,
  openai: OpenAIProvider,
  gemini: GeminiProvider,
  openrouter: OpenRouterProvider,
};

export function createProvider(providerId: string, apiKey: string): ILLMProvider {
  const Constructor = PROVIDER_REGISTRY[providerId];
  if (!Constructor) {
    throw new Error(`Unknown provider: ${providerId}. Available: ${Object.keys(PROVIDER_REGISTRY).join(', ')}`);
  }
  return new Constructor(apiKey);
}

export function getAvailableProviders(): string[] {
  return Object.keys(PROVIDER_REGISTRY);
}
