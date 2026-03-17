/**
 * ToolExecutor — dispatches tool calls to implementations.
 * All execution happens within the validated workspace.
 */

import type { ToolResult } from './types.js';
import type { LLMToolDefinition, LLMToolCall } from '../providers/types.js';
import { PathValidator } from './path-validator.js';
import { TOOL_DEFINITIONS } from './tool-definitions.js';
import { readTool } from './implementations/read-tool.js';
import { writeTool } from './implementations/write-tool.js';
import { editTool } from './implementations/edit-tool.js';
import { globTool } from './implementations/glob-tool.js';
import { grepTool } from './implementations/grep-tool.js';
import { bashTool } from './implementations/bash-tool.js';

export class ToolExecutor {
  private readonly pv: PathValidator;

  constructor(workspaceRoot: string) {
    this.pv = new PathValidator(workspaceRoot);
  }

  getToolDefinitions(): LLMToolDefinition[] {
    return TOOL_DEFINITIONS;
  }

  async execute(toolCall: LLMToolCall): Promise<ToolResult> {
    const start = Date.now();
    const input = toolCall.input;

    let result: ToolResult;
    switch (toolCall.name) {
      case 'Read':
        result = await readTool(input as { file_path: string; offset?: number; limit?: number }, this.pv);
        break;
      case 'Write':
        result = await writeTool(input as { file_path: string; content: string }, this.pv);
        break;
      case 'Edit':
        result = await editTool(input as { file_path: string; old_string: string; new_string: string; replace_all?: boolean }, this.pv);
        break;
      case 'Glob':
        result = await globTool(input as { pattern: string; path?: string }, this.pv);
        break;
      case 'Grep':
        result = await grepTool(input as { pattern: string; path?: string; glob?: string }, this.pv);
        break;
      case 'Bash':
        result = await bashTool(input as { command: string; timeout?: number }, this.pv);
        break;
      default:
        result = { toolCallId: toolCall.id, name: toolCall.name, output: `Unknown tool: ${toolCall.name}`, isError: true, durationMs: 0 };
    }

    result.toolCallId = toolCall.id;
    result.durationMs = Date.now() - start;
    return result;
  }

  async executeBatch(toolCalls: readonly LLMToolCall[]): Promise<readonly ToolResult[]> {
    return Promise.all(toolCalls.map((tc) => this.execute(tc)));
  }
}
