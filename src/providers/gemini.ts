/**
 * Gemini provider — fetch-based (zero SDK deps).
 * Uses Google Generative Language API format.
 */

import type { ILLMProvider, LLMCapabilities, LLMRequest, LLMResponse, LLMStreamChunk, LLMToolCall, CostEstimate } from './types.js';

const GEMINI_CAPABILITIES: LLMCapabilities = {
  streaming: true, toolUse: true, vision: true,
  maxContextTokens: 1_000_000, maxOutputTokens: 8_192,
  supportedModels: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'],
};

const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.0-pro': { input: 1.25, output: 10.0 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
};

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider implements ILLMProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly capabilities = GEMINI_CAPABILITIES;
  private readonly apiKey: string;

  constructor(apiKey: string) { this.apiKey = apiKey; }

  async sendMessage(request: LLMRequest): Promise<LLMResponse> {
    const res = await fetch(`${BASE}/models/${request.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.buildBody(request)),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    return this.parseResponse(await res.json() as GeminiResponse);
  }

  async *streamMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const res = await fetch(`${BASE}/models/${request.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.buildBody(request)),
    });
    if (!res.ok || !res.body) { yield { type: 'error', content: `Gemini error ${res.status}` }; return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(line.slice(6)) as GeminiResponse;
          const parts = parsed.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (part.text) yield { type: 'text', content: part.text };
            if (part.functionCall) {
              yield { type: 'tool_use_start', toolCall: { id: `gem-${Date.now()}`, name: part.functionCall.name } };
              yield { type: 'tool_use_input', content: JSON.stringify(part.functionCall.args) };
            }
          }
          if (parsed.candidates?.[0]?.finishReason) {
            const usage = parsed.usageMetadata;
            yield { type: 'done', usage: usage ? { inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount } : undefined };
          }
        } catch { /* skip */ }
      }
    }
  }

  async validateApiKey(key: string): Promise<boolean> {
    try { return (await fetch(`${BASE}/models?key=${key}`)).ok; }
    catch { return false; }
  }

  estimateCost(request: LLMRequest): CostEstimate {
    const rates = PRICING[request.model] ?? PRICING['gemini-2.0-flash']!;
    const inputTokens = Math.ceil(((request.systemPrompt?.length ?? 0) + request.messages.reduce((s, m) => s + m.content.length, 0)) / 4);
    return {
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: request.maxTokens ?? 4096,
      estimatedCostUSD: (inputTokens * rates.input + (request.maxTokens ?? 4096) * rates.output) / 1_000_000,
      model: request.model,
      provider: 'gemini',
    };
  }

  private buildBody(request: LLMRequest): Record<string, unknown> {
    const contents = request.messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
    return {
      contents,
      systemInstruction: request.systemPrompt ? { parts: [{ text: request.systemPrompt }] } : undefined,
      tools: request.tools?.length ? [{ functionDeclarations: request.tools.map((t) => ({ name: t.name, description: t.description, parameters: t.inputSchema })) }] : undefined,
      generationConfig: { maxOutputTokens: request.maxTokens ?? 8192, temperature: request.temperature ?? 0.7 },
    };
  }

  private parseResponse(data: GeminiResponse): LLMResponse {
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const toolCalls: LLMToolCall[] = parts.filter((p) => p.functionCall).map((p) => ({
      id: `gem-${Date.now()}`, name: p.functionCall!.name, input: (p.functionCall!.args ?? {}) as Record<string, unknown>,
    }));
    return {
      content: parts.filter((p) => p.text).map((p) => p.text!).join(''),
      toolCalls,
      usage: { inputTokens: data.usageMetadata?.promptTokenCount ?? 0, outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0 },
      stopReason: parts.some((p) => p.functionCall) ? 'tool_use' : data.candidates?.[0]?.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn',
    };
  }
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts: GeminiPart[] }; finishReason?: string }>;
  usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
}
interface GeminiPart { text?: string; functionCall?: { name: string; args?: unknown } }
