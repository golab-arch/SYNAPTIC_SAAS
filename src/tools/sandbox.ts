/**
 * SandboxManager — abstraction over E2B and Docker sandbox runtimes.
 * Manages sandbox lifecycle: create, execute, destroy.
 */

// TODO: Implement in Phase 4

import type { SandboxConfig, ToolResult } from './types.js';

export class SandboxManager {
  private config: SandboxConfig | null = null;

  /**
   * Initialize a sandbox for a session.
   */
  async create(config: SandboxConfig): Promise<void> {
    // TODO: Implement in Phase 4
    this.config = config;
    throw new Error('SandboxManager.create not implemented');
  }

  /**
   * Execute a command inside the sandbox.
   */
  async execute(toolName: string, input: Record<string, unknown>): Promise<ToolResult> {
    // TODO: Implement in Phase 4
    void toolName;
    void input;
    void this.config;
    throw new Error('SandboxManager.execute not implemented');
  }

  /**
   * Tear down the sandbox and clean up resources.
   */
  async destroy(): Promise<void> {
    // TODO: Implement in Phase 4
    this.config = null;
    throw new Error('SandboxManager.destroy not implemented');
  }
}
