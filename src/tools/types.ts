/**
 * Tool execution types — definitions and results for sandboxed tool calls.
 */

/** Definition of a tool available for execution */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly timeoutMs: number;
  readonly memoryLimitMB: number;
}

/** Result of executing a tool in the sandbox */
export interface ToolResult {
  readonly toolCallId: string;
  readonly name: string;
  readonly output: string;
  readonly isError: boolean;
  readonly durationMs: number;
}

/** Configuration for a sandbox instance */
export interface SandboxConfig {
  readonly type: 'e2b' | 'docker';
  readonly timeoutMs: number;
  readonly memoryLimitMB: number;
  readonly tenantId: string;
  readonly sessionId: string;
}
