/**
 * OpenAI provider adapter.
 * Implements ILLMProvider for the OpenAI Chat Completions API.
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

const OPENAI_CAPABILITIES: LLMCapabilities = {
  streaming: true,
  toolUse: true,
  vision: true,
  maxContextTokens: 128_000,
  maxOutputTokens: 4_096,
  supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini'],
};

export class OpenAIProvider implements ILLMProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly capabilities = OPENAI_CAPABILITIES;

  private readonly apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async sendMessage(_request: LLMRequest): Promise<LLMResponse> {
    void this.apiKey; // Will be used when implemented
    // TODO: Implement in Phase 2
    throw new Error('OpenAIProvider.sendMessage not implemented');
  }

  async *streamMessage(_request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    // TODO: Implement in Phase 2
    throw new Error('OpenAIProvider.streamMessage not implemented');
  }

  async validateApiKey(_key: string): Promise<boolean> {
    // TODO: Implement in Phase 2
    throw new Error('OpenAIProvider.validateApiKey not implemented');
  }

  estimateCost(_request: LLMRequest): CostEstimate {
    // TODO: Implement in Phase 2
    throw new Error('OpenAIProvider.estimateCost not implemented');
  }
}
