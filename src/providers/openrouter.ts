/**
 * OpenRouter provider adapter.
 * Implements ILLMProvider for the OpenRouter unified gateway.
 */

// TODO: Implement in Phase 2

import type {
  ILLMProvider,
  LLMCapabilities,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  CostEstimate,
} from './types.js';

const OPENROUTER_CAPABILITIES: LLMCapabilities = {
  streaming: true,
  toolUse: true,
  vision: true,
  maxContextTokens: 200_000,
  maxOutputTokens: 8_192,
  supportedModels: ['anthropic/claude-sonnet-4', 'openai/gpt-4o', 'google/gemini-2.0-flash'],
};

export class OpenRouterProvider implements ILLMProvider {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter';
  readonly capabilities = OPENROUTER_CAPABILITIES;

  private readonly apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async sendMessage(_request: LLMRequest): Promise<LLMResponse> {
    void this.apiKey; // Will be used when implemented
    // TODO: Implement in Phase 2
    throw new Error('OpenRouterProvider.sendMessage not implemented');
  }

  async *streamMessage(_request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    // TODO: Implement in Phase 2
    throw new Error('OpenRouterProvider.streamMessage not implemented');
  }

  async validateApiKey(_key: string): Promise<boolean> {
    // TODO: Implement in Phase 2
    throw new Error('OpenRouterProvider.validateApiKey not implemented');
  }

  estimateCost(_request: LLMRequest): CostEstimate {
    // TODO: Implement in Phase 2
    throw new Error('OpenRouterProvider.estimateCost not implemented');
  }
}
