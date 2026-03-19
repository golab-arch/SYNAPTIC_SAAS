/**
 * Orchestrator types — request/response shapes for the AgentLoopService.
 */

import type { LLMMessage, LLMToolDefinition, TokenUsage } from '../providers/types.js';
import type { ToolResult } from '../tools/types.js';

/** Identifies which provider and model to use for a request */
export interface ProviderConfig {
  readonly providerId: string;
  readonly model: string;
  readonly apiKey: string;
}

/** A request to the orchestrator */
export interface OrchestrationRequest {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly messages: readonly LLMMessage[];
  readonly provider: ProviderConfig;
  readonly prompt: string;
  readonly tools?: readonly LLMToolDefinition[];
  readonly maxTurns?: number;
}

/** A single turn result within the orchestration loop */
export interface OrchestrationTurn {
  readonly turnNumber: number;
  readonly llmContent: string;
  readonly toolCalls: readonly ToolResult[];
  readonly usage: TokenUsage;
}

/** Final result of an orchestration run */
export interface OrchestrationResponse {
  readonly sessionId: string;
  readonly turns: readonly OrchestrationTurn[];
  readonly finalContent: string;
  readonly totalUsage: TokenUsage;
  readonly stopReason: 'completed' | 'max_turns' | 'error';
}

/** SSE event emitted during streaming */
export interface SSEEvent {
  readonly event: 'message' | 'tool_use' | 'tool_result' | 'regeneration' | 'sai_audit' | 'guidance' | 'done' | 'error';
  readonly data: unknown;
}
