/**
 * Factory for instantiating LLM providers by name.
 */

import type { ILLMProvider } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';

export type ProviderId = 'anthropic' | 'openai';

const PROVIDER_REGISTRY: Record<string, new (apiKey: string) => ILLMProvider> = {
  anthropic: AnthropicProvider,
  openai: OpenAIProvider,
};

/**
 * Create an LLM provider instance by ID.
 */
export function createProvider(providerId: string, apiKey: string): ILLMProvider {
  const Constructor = PROVIDER_REGISTRY[providerId];
  if (!Constructor) {
    throw new Error(
      `Unknown provider: ${providerId}. Available: ${Object.keys(PROVIDER_REGISTRY).join(', ')}`,
    );
  }
  return new Constructor(apiKey);
}

/**
 * List all registered provider IDs.
 */
export function getAvailableProviders(): string[] {
  return Object.keys(PROVIDER_REGISTRY);
}
