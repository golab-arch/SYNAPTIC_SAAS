/**
 * Edit tool — string replacement in file.
 */

import { readFile, writeFile } from 'node:fs/promises';
import type { ToolResult } from '../types.js';
import type { PathValidator } from '../path-validator.js';

export async function editTool(
  input: { file_path: string; old_string: string; new_string: string; replace_all?: boolean },
  pv: PathValidator,
): Promise<ToolResult> {
  const v = pv.validate(input.file_path);
  if (!v.valid) return err(v.error!);

  try {
    let content = await readFile(v.resolved, 'utf-8');

    if (!content.includes(input.old_string)) {
      return err(`old_string not found in ${input.file_path}`);
    }

    if (input.replace_all) {
      content = content.replaceAll(input.old_string, input.new_string);
    } else {
      const count = content.split(input.old_string).length - 1;
      if (count > 1) {
        return err(`old_string found ${count} times. Use replace_all or provide more context.`);
      }
      content = content.replace(input.old_string, input.new_string);
    }

    await writeFile(v.resolved, content, 'utf-8');
    return ok(`Edited ${input.file_path}`);
  } catch (e) {
    return err(`Cannot edit: ${e instanceof Error ? e.message : e}`);
  }
}

function ok(output: string): ToolResult {
  return { toolCallId: '', name: 'Edit', output, isError: false, durationMs: 0 };
}
function err(msg: string): ToolResult {
  return { toolCallId: '', name: 'Edit', output: msg, isError: true, durationMs: 0 };
}
