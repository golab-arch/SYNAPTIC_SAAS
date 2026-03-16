/**
 * ToolExecutor — dispatches tool calls to the sandbox for execution.
 * All tool execution happens inside E2B or Docker — never on the host.
 */

// TODO: Implement in Phase 1

import type { ToolResult } from './types.js';
import type { LLMToolCall } from '../providers/types.js';
import type { SandboxManager } from './sandbox.js';

export class ToolExecutor {
  constructor(private readonly sandbox: SandboxManager) {}

  /**
   * Execute a tool call inside the sandbox.
   * Timeout: 30s per call. Memory limit: 512MB.
   */
  async execute(toolCall: LLMToolCall): Promise<ToolResult> {
    // TODO: Implement in Phase 1
    // 1. Validate tool name against allowed tools
    // 2. Dispatch to sandbox
    // 3. Collect result with timeout
    // 4. Sanitize output before returning
    void toolCall;
    void this.sandbox;
    throw new Error('ToolExecutor.execute not implemented');
  }

  /**
   * Execute multiple tool calls (potentially in parallel).
   */
  async executeBatch(toolCalls: readonly LLMToolCall[]): Promise<readonly ToolResult[]> {
    // TODO: Implement in Phase 1
    void toolCalls;
    throw new Error('ToolExecutor.executeBatch not implemented');
  }
}
