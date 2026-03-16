/**
 * Google Gemini provider adapter.
 * Implements ILLMProvider for the Gemini Generative Language API.
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

const GEMINI_CAPABILITIES: LLMCapabilities = {
  streaming: true,
  toolUse: true,
  vision: true,
  maxContextTokens: 1_000_000,
  maxOutputTokens: 8_192,
  supportedModels: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'],
};

export class GeminiProvider implements ILLMProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly capabilities = GEMINI_CAPABILITIES;

  private readonly apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async sendMessage(_request: LLMRequest): Promise<LLMResponse> {
    void this.apiKey; // Will be used when implemented
    // TODO: Implement in Phase 2
    throw new Error('GeminiProvider.sendMessage not implemented');
  }

  async *streamMessage(_request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    // TODO: Implement in Phase 2
    throw new Error('GeminiProvider.streamMessage not implemented');
  }

  async validateApiKey(_key: string): Promise<boolean> {
    // TODO: Implement in Phase 2
    throw new Error('GeminiProvider.validateApiKey not implemented');
  }

  estimateCost(_request: LLMRequest): CostEstimate {
    // TODO: Implement in Phase 2
    throw new Error('GeminiProvider.estimateCost not implemented');
  }
}
