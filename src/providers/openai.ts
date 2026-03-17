/**
 * OpenAI provider adapter — fetch-based (zero SDK deps).
 * Uses native fetch against https://api.openai.com/v1.
 * API key comes from user (BYOK) — never hardcoded.
 */

import type {
  ILLMProvider,
  LLMCapabilities,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMToolCall,
  CostEstimate,
  LLMToolDefinition,
} from './types.js';

const OPENAI_CAPABILITIES: LLMCapabilities = {
  streaming: true,
  toolUse: true,
  vision: true,
  maxContextTokens: 128_000,
  maxOutputTokens: 16_384,
  supportedModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
};

const OPENAI_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'o3-mini': { input: 1.1, output: 4.4 },
};
const DEFAULT_PRICING = { input: 2.5, output: 10.0 };

const BASE_URL = 'https://api.openai.com/v1';

export class OpenAIProvider implements ILLMProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly capabilities = OPENAI_CAPABILITIES;

  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(request: LLMRequest): Promise<LLMResponse> {
    const body = {
      model: request.model,
      messages: buildOpenAIMessages(request),
      tools: request.tools ? convertToolsToOpenAI(request.tools) : undefined,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature,
      stream: false,
    };

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      const errObj = err['error'] as Record<string, unknown> | undefined;
      throw new Error(`OpenAI API error ${res.status}: ${errObj?.['message'] ?? res.statusText}`);
    }

    const data = await res.json() as OpenAIChatResponse;
    const choice = data.choices[0]!;
    const msg = choice.message;

    const toolCalls: LLMToolCall[] = (msg.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    return {
      content: msg.content ?? '',
      toolCalls,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      },
      stopReason: choice.finish_reason === 'tool_calls' ? 'tool_use'
        : choice.finish_reason === 'length' ? 'max_tokens'
        : 'end_turn',
    };
  }

  async *streamMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const body = {
      model: request.model,
      messages: buildOpenAIMessages(request),
      tools: request.tools ? convertToolsToOpenAI(request.tools) : undefined,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature,
      stream: true,
    };

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      yield { type: 'error', content: `OpenAI error ${res.status}` };
      return;
    }

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
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') {
          yield { type: 'done' };
          return;
        }

        try {
          const parsed = JSON.parse(payload) as OpenAIStreamChunk;
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            yield { type: 'text', content: delta.content };
          }
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.function?.name) {
                yield { type: 'tool_use_start', toolCall: { id: tc.id, name: tc.function.name } };
              }
              if (tc.function?.arguments) {
                yield { type: 'tool_use_input', content: tc.function.arguments };
              }
            }
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  }

  async validateApiKey(key: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/models`, {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  estimateCost(request: LLMRequest): CostEstimate {
    const pricing = OPENAI_PRICING[request.model] ?? DEFAULT_PRICING;
    const inputTokens = estimateTokenCount(
      (request.systemPrompt ?? '') + request.messages.map((m) => m.content).join(''),
    );
    const outputTokens = request.maxTokens ?? 4096;

    return {
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      estimatedCostUSD:
        (inputTokens / 1_000_000) * pricing.input +
        (outputTokens / 1_000_000) * pricing.output,
      model: request.model,
      provider: 'openai',
    };
  }
}

// ─── OpenAI-specific types ──────────────────────────────────────

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: Array<{
        id: string;
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number };
}

interface OpenAIStreamChunk {
  choices?: Array<{
    delta: {
      content?: string;
      tool_calls?: Array<{
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
}

// ─── Helpers ────────────────────────────────────────────────────

function buildOpenAIMessages(request: LLMRequest): Array<Record<string, unknown>> {
  const messages: Array<Record<string, unknown>> = [];
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }
  for (const msg of request.messages) {
    messages.push({ role: msg.role, content: msg.content });
  }
  return messages;
}

function convertToolsToOpenAI(tools: readonly LLMToolDefinition[]): Array<Record<string, unknown>> {
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.inputSchema },
  }));
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
