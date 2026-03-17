/**
 * Tool definitions for LLM — JSON Schema format.
 */

import type { LLMToolDefinition } from '../providers/types.js';

export const TOOL_DEFINITIONS: LLMToolDefinition[] = [
  {
    name: 'Read',
    description: 'Read a file from the workspace. Returns content with line numbers.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path relative to workspace root' },
        offset: { type: 'number', description: 'Starting line (0-based)' },
        limit: { type: 'number', description: 'Number of lines to read' },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'Write',
    description: 'Create or overwrite a file in the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path relative to workspace root' },
        content: { type: 'string', description: 'File content' },
      },
      required: ['file_path', 'content'],
    },
  },
  {
    name: 'Edit',
    description: 'Replace a string in a file. old_string must be unique unless replace_all is true.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path relative to workspace root' },
        old_string: { type: 'string', description: 'String to replace' },
        new_string: { type: 'string', description: 'Replacement string' },
        replace_all: { type: 'boolean', description: 'Replace all occurrences' },
      },
      required: ['file_path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'Glob',
    description: 'Find files matching a glob pattern.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern (e.g., "**/*.ts")' },
        path: { type: 'string', description: 'Base directory' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'Grep',
    description: 'Search for a regex pattern across files.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern' },
        path: { type: 'string', description: 'Directory to search' },
        glob: { type: 'string', description: 'File glob filter' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'Bash',
    description: 'Execute a shell command (restricted to safe commands).',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command' },
        timeout: { type: 'number', description: 'Timeout in ms (max 60000)' },
      },
      required: ['command'],
    },
  },
];
