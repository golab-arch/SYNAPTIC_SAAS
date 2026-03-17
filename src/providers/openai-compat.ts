/**
 * OpenAI-compatible helpers — shared between OpenAI and OpenRouter providers.
 */

import type { LLMRequest, LLMResponse, LLMStreamChunk, LLMToolCall, LLMToolDefinition, CostEstimate } from './types.js';

/** Build OpenAI-format message array from LLMRequest */
export function buildOpenAIMessages(request: LLMRequest): Array<Record<string, unknown>> {
  const messages: Array<Record<string, unknown>> = [];
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }
  for (const msg of request.messages) {
    messages.push({ role: msg.role, content: msg.content });
  }
  return messages;
}

/** Convert tools to OpenAI function format */
export function convertToolsToOpenAI(tools: readonly LLMToolDefinition[]): Array<Record<string, unknown>> {
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.inputSchema },
  }));
}

/** Build request body for OpenAI-compatible APIs */
export function buildOpenAIBody(request: LLMRequest, stream: boolean): Record<string, unknown> {
  return {
    model: request.model,
    messages: buildOpenAIMessages(request),
    tools: request.tools ? convertToolsToOpenAI(request.tools) : undefined,
    max_tokens: request.maxTokens ?? 4096,
    temperature: request.temperature,
    stream,
  };
}

/** Parse a non-streaming OpenAI response */
export function parseOpenAIResponse(data: OpenAICompletionResponse): LLMResponse {
  const choice = data.choices[0]!;
  const msg = choice.message;

  const toolCalls: LLMToolCall[] = (msg.tool_calls ?? []).map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    input: safeParse(tc.function.arguments),
  }));

  return {
    content: msg.content ?? '',
    toolCalls,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
    stopReason: choice.finish_reason === 'tool_calls' ? 'tool_use'
      : choice.finish_reason === 'length' ? 'max_tokens'
      : 'end_turn',
  };
}

/** Parse OpenAI SSE stream */
export async function* parseOpenAIStream(body: ReadableStream<Uint8Array>): AsyncGenerator<LLMStreamChunk> {
  const reader = body.getReader();
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
        // Skip malformed lines
      }
    }
  }
}

/** Estimate cost */
export function estimateOpenAICost(
  request: LLMRequest,
  pricing: Record<string, { input: number; output: number }>,
  defaultPricing: { input: number; output: number },
  provider: string,
): CostEstimate {
  const rates = pricing[request.model] ?? defaultPricing;
  const inputTokens = estimateTokens(request);
  const outputTokens = request.maxTokens ?? 4096;
  return {
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedCostUSD: (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output,
    model: request.model,
    provider,
  };
}

function estimateTokens(request: LLMRequest): number {
  const systemLen = request.systemPrompt?.length ?? 0;
  const msgLen = request.messages.reduce((s, m) => s + m.content.length, 0);
  return Math.ceil((systemLen + msgLen) / 4);
}

function safeParse(json: string): Record<string, unknown> {
  try { return JSON.parse(json) as Record<string, unknown>; }
  catch { return {}; }
}

// ─── Types ──────────────────────────────────────────────────────

export interface OpenAICompletionResponse {
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
  usage?: { prompt_tokens: number; completion_tokens: number };
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
