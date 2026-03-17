/**
 * OpenRouter provider — OpenAI-compatible with attribution headers.
 * Reuses shared openai-compat helpers.
 */

import type { ILLMProvider, LLMCapabilities, LLMRequest, LLMResponse, LLMStreamChunk, CostEstimate } from './types.js';
import { buildOpenAIBody, parseOpenAIResponse, parseOpenAIStream, type OpenAICompletionResponse } from './openai-compat.js';

const OPENROUTER_CAPABILITIES: LLMCapabilities = {
  streaming: true, toolUse: true, vision: true,
  maxContextTokens: 200_000, maxOutputTokens: 16_384,
  supportedModels: ['anthropic/claude-sonnet-4', 'openai/gpt-4o', 'google/gemini-2.0-flash', 'meta-llama/llama-3.3-70b-instruct'],
};

const BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterProvider implements ILLMProvider {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter';
  readonly capabilities = OPENROUTER_CAPABILITIES;
  private readonly apiKey: string;

  constructor(apiKey: string) { this.apiKey = apiKey; }

  async sendMessage(request: LLMRequest): Promise<LLMResponse> {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(buildOpenAIBody(request, false)),
    });
    if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
    return parseOpenAIResponse(await res.json() as OpenAICompletionResponse);
  }

  async *streamMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(buildOpenAIBody(request, true)),
    });
    if (!res.ok || !res.body) { yield { type: 'error', content: `OpenRouter error ${res.status}` }; return; }
    yield* parseOpenAIStream(res.body);
  }

  async validateApiKey(key: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/auth/key`, { headers: { 'Authorization': `Bearer ${key}` } });
      return res.ok;
    } catch { return false; }
  }

  estimateCost(request: LLMRequest): CostEstimate {
    // OpenRouter pricing varies by model; return zero estimate
    const inputTokens = Math.ceil(((request.systemPrompt?.length ?? 0) + request.messages.reduce((s, m) => s + m.content.length, 0)) / 4);
    return { estimatedInputTokens: inputTokens, estimatedOutputTokens: request.maxTokens ?? 4096, estimatedCostUSD: 0, model: request.model, provider: 'openrouter' };
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://synaptic-saas.com',
      'X-Title': 'SYNAPTIC_SAAS',
    };
  }
}
