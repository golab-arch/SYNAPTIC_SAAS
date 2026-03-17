/**
 * Read tool — read file contents with line numbers.
 */

import { readFile } from 'node:fs/promises';
import type { ToolResult } from '../types.js';
import type { PathValidator } from '../path-validator.js';

export async function readTool(
  input: { file_path: string; offset?: number; limit?: number },
  pv: PathValidator,
): Promise<ToolResult> {
  const v = pv.validate(input.file_path);
  if (!v.valid) return err(v.error!);

  try {
    const content = await readFile(v.resolved, 'utf-8');
    const lines = content.split('\n');
    const start = input.offset ?? 0;
    const end = input.limit ? start + input.limit : lines.length;
    const selected = lines.slice(start, end);
    const output = selected
      .map((line, i) => `${String(start + i + 1).padStart(6)}│${line}`)
      .join('\n');
    return ok(output);
  } catch (e) {
    return err(`Cannot read: ${e instanceof Error ? e.message : e}`);
  }
}

function ok(output: string): ToolResult {
  return { toolCallId: '', name: 'Read', output, isError: false, durationMs: 0 };
}
function err(msg: string): ToolResult {
  return { toolCallId: '', name: 'Read', output: msg, isError: true, durationMs: 0 };
}
