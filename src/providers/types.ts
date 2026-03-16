/**
 * Core LLM Provider interfaces and types.
 * ILLMProvider is the MOST IMPORTANT contract in SYNAPTIC_SAAS.
 * ALL LLM providers MUST implement this interface — no exceptions.
 */

/** Capabilities advertised by a provider */
export interface LLMCapabilities {
  readonly streaming: boolean;
  readonly toolUse: boolean;
  readonly vision: boolean;
  readonly maxContextTokens: number;
  readonly maxOutputTokens: number;
  readonly supportedModels: readonly string[];
}

/** Role in a conversation message */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** A single message in a conversation */
export interface LLMMessage {
  readonly role: MessageRole;
  readonly content: string;
}

/** Tool definition sent to the LLM */
export interface LLMToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

/** Request payload for LLM calls */
export interface LLMRequest {
  readonly model: string;
  readonly messages: readonly LLMMessage[];
  readonly tools?: readonly LLMToolDefinition[];
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly systemPrompt?: string;
}

/** Tool call requested by the LLM */
export interface LLMToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

/** Complete response from the LLM */
export interface LLMResponse {
  readonly content: string;
  readonly toolCalls: readonly LLMToolCall[];
  readonly usage: TokenUsage;
  readonly stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'error';
}

/** A chunk in a streaming response */
export interface LLMStreamChunk {
  readonly type: 'text' | 'tool_use_start' | 'tool_use_input' | 'done' | 'error';
  readonly content?: string;
  readonly toolCall?: Partial<LLMToolCall>;
  readonly usage?: TokenUsage;
}

/** Token usage tracking */
export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

/** Cost estimation result */
export interface CostEstimate {
  readonly estimatedInputTokens: number;
  readonly estimatedOutputTokens: number;
  readonly estimatedCostUSD: number;
  readonly model: string;
  readonly provider: string;
}

/**
 * The unified LLM provider interface.
 * Every provider adapter (Anthropic, OpenAI, Gemini, OpenRouter) MUST implement this.
 */
export interface ILLMProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: LLMCapabilities;

  /** Send a message and get a complete response */
  sendMessage(request: LLMRequest): Promise<LLMResponse>;

  /** Send a message and stream the response */
  streamMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk>;

  /** Validate that an API key is functional */
  validateApiKey(key: string): Promise<boolean>;

  /** Estimate cost before execution */
  estimateCost(request: LLMRequest): CostEstimate;
}
