/**
 * OpenAI provider — fetch-based (zero SDK deps).
 * Uses shared openai-compat helpers.
 */

import type { ILLMProvider, LLMCapabilities, LLMRequest, LLMResponse, LLMStreamChunk, CostEstimate } from './types.js';
import { buildOpenAIBody, parseOpenAIResponse, parseOpenAIStream, estimateOpenAICost, type OpenAICompletionResponse } from './openai-compat.js';

const OPENAI_CAPABILITIES: LLMCapabilities = {
  streaming: true, toolUse: true, vision: true,
  maxContextTokens: 128_000, maxOutputTokens: 16_384,
  supportedModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
};

const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'o3-mini': { input: 1.1, output: 4.4 },
};

export class OpenAIProvider implements ILLMProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly capabilities = OPENAI_CAPABILITIES;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) { this.apiKey = apiKey; }

  async sendMessage(request: LLMRequest): Promise<LLMResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(buildOpenAIBody(request, false)),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    return parseOpenAIResponse(await res.json() as OpenAICompletionResponse);
  }

  async *streamMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(buildOpenAIBody(request, true)),
    });
    if (!res.ok || !res.body) { yield { type: 'error', content: `OpenAI error ${res.status}` }; return; }
    yield* parseOpenAIStream(res.body);
  }

  async validateApiKey(key: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, { headers: { 'Authorization': `Bearer ${key}` } });
      return res.ok;
    } catch { return false; }
  }

  estimateCost(request: LLMRequest): CostEstimate {
    return estimateOpenAICost(request, PRICING, { input: 2.5, output: 10 }, 'openai');
  }

  private headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` };
  }
}
