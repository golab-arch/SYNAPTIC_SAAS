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

// ─── Provider Error Classification (DG-126) ────────────────────

/** 10 error categories for provider errors */
export type ProviderErrorCategory =
  | 'MODEL_NOT_FOUND'
  | 'MODEL_ACCESS_DENIED'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'PROVIDER_OVERLOADED'
  | 'AUTH_FAILED'
  | 'INVALID_REQUEST'
  | 'CANCELLED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

const DEFAULT_USER_MESSAGES: Record<ProviderErrorCategory, string> = {
  MODEL_NOT_FOUND: 'Model no longer available — it may have been deprecated',
  MODEL_ACCESS_DENIED: 'Your API key does not have access to this model',
  RATE_LIMITED: 'Rate limit reached — wait a moment and try again',
  QUOTA_EXHAUSTED: 'No remaining credits for this provider',
  PROVIDER_OVERLOADED: 'Provider is temporarily overloaded',
  AUTH_FAILED: 'API key is invalid or has been revoked',
  INVALID_REQUEST: 'Request is incompatible with this model',
  CANCELLED: 'Request was cancelled',
  NETWORK_ERROR: 'Could not connect to provider',
  UNKNOWN: 'An unexpected error occurred',
};

const DEFAULT_SUGGESTIONS: Record<ProviderErrorCategory, string> = {
  MODEL_NOT_FOUND: 'Select a different model',
  MODEL_ACCESS_DENIED: 'Try a different model or check your API plan',
  RATE_LIMITED: 'Wait 30-60 seconds or switch to a different model',
  QUOTA_EXHAUSTED: 'Add credits or switch to a different provider',
  PROVIDER_OVERLOADED: 'Wait a few minutes or try a different provider',
  AUTH_FAILED: 'Check and update your API key',
  INVALID_REQUEST: 'Try a different model that supports this request',
  CANCELLED: '',
  NETWORK_ERROR: 'Check your internet connection',
  UNKNOWN: 'Try again or switch provider',
};

/** Classified provider error with user-facing message */
export class ProviderError extends Error {
  readonly category: ProviderErrorCategory;
  readonly statusCode?: number;
  readonly userMessage: string;
  readonly suggestion: string;

  constructor(
    category: ProviderErrorCategory,
    message: string,
    options?: { statusCode?: number; userMessage?: string; suggestion?: string },
  ) {
    super(message);
    this.name = 'ProviderError';
    this.category = category;
    this.statusCode = options?.statusCode;
    this.userMessage = options?.userMessage ?? DEFAULT_USER_MESSAGES[category];
    this.suggestion = options?.suggestion ?? DEFAULT_SUGGESTIONS[category];
  }
}

function classifyHttpStatus(status: number): ProviderErrorCategory | null {
  switch (status) {
    case 400: return 'INVALID_REQUEST';
    case 401: return 'AUTH_FAILED';
    case 402: return 'QUOTA_EXHAUSTED';
    case 403: return 'MODEL_ACCESS_DENIED';
    case 404: return 'MODEL_NOT_FOUND';
    case 429: return 'RATE_LIMITED';
    case 502: case 503: case 529: return 'PROVIDER_OVERLOADED';
    default: return null;
  }
}

/** Classify a raw error into a ProviderError */
export function classifyProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;

  const err = error as Record<string, unknown>;
  const status = typeof err.status === 'number' ? err.status : undefined;
  const message = error instanceof Error ? error.message : String(error);

  // 1. By HTTP status
  if (status) {
    const cat = classifyHttpStatus(status);
    if (cat) return new ProviderError(cat, message, { statusCode: status });
  }

  // 2. By message patterns
  const m = message.toLowerCase();
  if (/rate.?limit|429|too many requests/.test(m))
    return new ProviderError('RATE_LIMITED', message, { statusCode: 429 });
  if (/not found|does not exist|404/.test(m))
    return new ProviderError('MODEL_NOT_FOUND', message, { statusCode: 404 });
  if (/unauthorized|invalid.*(api|x-api).?key|authentication|401/.test(m))
    return new ProviderError('AUTH_FAILED', message, { statusCode: 401 });
  if (/permission|forbidden|access denied/.test(m))
    return new ProviderError('MODEL_ACCESS_DENIED', message, { statusCode: 403 });
  if (/insufficient|quota|billing|402/.test(m))
    return new ProviderError('QUOTA_EXHAUSTED', message, { statusCode: 402 });
  if (/overloaded|529|capacity/.test(m))
    return new ProviderError('PROVIDER_OVERLOADED', message);
  if (/abort|cancel/.test(m))
    return new ProviderError('CANCELLED', message);
  if (/econnrefused|enotfound|network|fetch failed/.test(m))
    return new ProviderError('NETWORK_ERROR', message);

  return new ProviderError('UNKNOWN', message);
}

// ─── LLM Provider Interface ────────────────────────────────────

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
