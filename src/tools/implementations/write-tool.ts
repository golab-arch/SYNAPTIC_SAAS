/**
 * Write tool — create or overwrite file.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ToolResult } from '../types.js';
import type { PathValidator } from '../path-validator.js';

const MAX_FILE_SIZE = 1_000_000; // 1MB

export async function writeTool(
  input: { file_path: string; content: string },
  pv: PathValidator,
): Promise<ToolResult> {
  const v = pv.validate(input.file_path);
  if (!v.valid) return err(v.error!);

  if (input.content.length > MAX_FILE_SIZE) {
    return err(`File content exceeds ${MAX_FILE_SIZE} byte limit`);
  }

  try {
    await mkdir(dirname(v.resolved), { recursive: true });
    await writeFile(v.resolved, input.content, 'utf-8');
    return ok(`Wrote ${input.content.length} bytes to ${input.file_path}`);
  } catch (e) {
    return err(`Cannot write: ${e instanceof Error ? e.message : e}`);
  }
}

function ok(output: string): ToolResult {
  return { toolCallId: '', name: 'Write', output, isError: false, durationMs: 0 };
}
function err(msg: string): ToolResult {
  return { toolCallId: '', name: 'Write', output: msg, isError: true, durationMs: 0 };
}
