/**
 * Anthropic provider adapter — FUNCTIONAL implementation.
 * Uses @anthropic-ai/sdk to call Claude API directly.
 * API key comes from user (BYOK) — never hardcoded.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ILLMProvider,
  LLMCapabilities,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMToolCall,
  CostEstimate,
  TokenUsage,
  LLMToolDefinition,
} from './types.js';

const ANTHROPIC_CAPABILITIES: LLMCapabilities = {
  streaming: true,
  toolUse: true,
  vision: true,
  maxContextTokens: 200_000,
  maxOutputTokens: 8_192,
  supportedModels: [
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-haiku-4-5-20251001',
  ],
};

/** Approximate pricing per million tokens (USD) */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
};
const DEFAULT_PRICING = { input: 3, output: 15 };

export class AnthropicProvider implements ILLMProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic Claude';
  readonly capabilities = ANTHROPIC_CAPABILITIES;

  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async sendMessage(request: LLMRequest): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature,
      system: request.systemPrompt,
      messages: request.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      tools: request.tools ? mapToolsToAnthropic(request.tools) : undefined,
    });

    return mapAnthropicResponse(response);
  }

  async *streamMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const stream = this.client.messages.stream({
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature,
      system: request.systemPrompt,
      messages: request.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      tools: request.tools ? mapToolsToAnthropic(request.tools) : undefined,
    });

    let currentToolId: string | undefined;
    let currentToolName: string | undefined;
    let toolInputJson = '';

    for await (const event of stream) {
      switch (event.type) {
        case 'content_block_start': {
          const block = event.content_block;
          if (block.type === 'tool_use') {
            currentToolId = block.id;
            currentToolName = block.name;
            toolInputJson = '';
            yield {
              type: 'tool_use_start',
              toolCall: { id: block.id, name: block.name },
            };
          }
          break;
        }

        case 'content_block_delta': {
          const delta = event.delta;
          if (delta.type === 'text_delta') {
            yield { type: 'text', content: delta.text };
          } else if (delta.type === 'input_json_delta') {
            toolInputJson += delta.partial_json;
            yield {
              type: 'tool_use_input',
              toolCall: { id: currentToolId, name: currentToolName },
              content: delta.partial_json,
            };
          }
          break;
        }

        case 'message_delta': {
          const msg = stream.currentMessage;
          const usage: TokenUsage = {
            inputTokens: msg?.usage?.input_tokens ?? 0,
            outputTokens: event.usage?.output_tokens ?? 0,
          };
          yield { type: 'done', usage };
          break;
        }
      }
    }
  }

  async validateApiKey(key: string): Promise<boolean> {
    try {
      const testClient = new Anthropic({ apiKey: key });
      await testClient.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return true;
    } catch (error: unknown) {
      if (error instanceof Anthropic.AuthenticationError) return false;
      if (error instanceof Anthropic.PermissionDeniedError) return false;
      // Other errors (rate limit, server error) mean the key IS valid
      if (error instanceof Anthropic.RateLimitError) return true;
      return false;
    }
  }

  estimateCost(request: LLMRequest): CostEstimate {
    const pricing = PRICING[request.model] ?? DEFAULT_PRICING;
    const estimatedInputTokens = estimateTokenCount(
      (request.systemPrompt ?? '') +
      request.messages.map((m) => m.content).join(''),
    );
    const estimatedOutputTokens = request.maxTokens ?? 4096;

    return {
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCostUSD:
        (estimatedInputTokens / 1_000_000) * pricing.input +
        (estimatedOutputTokens / 1_000_000) * pricing.output,
      model: request.model,
      provider: 'anthropic',
    };
  }
}

// ─── Mapping helpers ────────────────────────────────────────────

function mapToolsToAnthropic(
  tools: readonly LLMToolDefinition[],
): Anthropic.Messages.Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Anthropic.Messages.Tool.InputSchema,
  }));
}

function mapAnthropicResponse(response: Anthropic.Messages.Message): LLMResponse {
  let content = '';
  const toolCalls: LLMToolCall[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      content += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      });
    }
  }

  const stopReasonMap: Record<string, LLMResponse['stopReason']> = {
    end_turn: 'end_turn',
    tool_use: 'tool_use',
    max_tokens: 'max_tokens',
  };

  return {
    content,
    toolCalls,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    stopReason: stopReasonMap[response.stop_reason ?? ''] ?? 'end_turn',
  };
}

function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}
