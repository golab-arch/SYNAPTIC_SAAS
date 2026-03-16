/**
 * Factory for instantiating LLM providers by name.
 * Uses the Strategy pattern — provider selection is user-driven per-session.
 */

// TODO: Implement in Phase 0

import type { ILLMProvider } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { GeminiProvider } from './gemini.js';
import { OpenRouterProvider } from './openrouter.js';

/** Supported provider identifiers */
export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'openrouter';

/** Registry of provider constructors */
const PROVIDER_REGISTRY: Record<ProviderId, new (apiKey: string) => ILLMProvider> = {
  anthropic: AnthropicProvider,
  openai: OpenAIProvider,
  gemini: GeminiProvider,
  openrouter: OpenRouterProvider,
};

/**
 * Create an LLM provider instance by ID.
 * @throws Error if providerId is not registered
 */
export function createProvider(providerId: string, apiKey: string): ILLMProvider {
  const Constructor = PROVIDER_REGISTRY[providerId as ProviderId];
  if (!Constructor) {
    throw new Error(`Unknown provider: ${providerId}. Available: ${Object.keys(PROVIDER_REGISTRY).join(', ')}`);
  }
  return new Constructor(apiKey);
}

/** List all registered provider IDs */
export function listProviders(): readonly ProviderId[] {
  return Object.keys(PROVIDER_REGISTRY) as ProviderId[];
}
