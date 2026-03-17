/**
 * Grep tool — search file contents with regex.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { ToolResult } from '../types.js';
import type { PathValidator } from '../path-validator.js';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.next']);
const MAX_RESULTS = 50;
const MAX_DEPTH = 10;

export async function grepTool(
  input: { pattern: string; path?: string; glob?: string },
  pv: PathValidator,
): Promise<ToolResult> {
  const base = input.path ?? '.';
  const v = pv.validate(base);
  if (!v.valid) return err(v.error!);

  try {
    const regex = new RegExp(input.pattern, 'gi');
    const files = await collectFiles(v.resolved, pv.getRoot(), 0);
    const results: string[] = [];

    for (const file of files) {
      if (results.length >= MAX_RESULTS) break;
      try {
        const content = await readFile(file.fullPath, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          regex.lastIndex = 0;
          if (regex.test(lines[i]!)) {
            results.push(`${file.relPath}:${i + 1}: ${lines[i]!.trim().substring(0, 200)}`);
            if (results.length >= MAX_RESULTS) break;
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    return ok(results.join('\n') || 'No matches');
  } catch (e) {
    return err(`Grep error: ${e instanceof Error ? e.message : e}`);
  }
}

async function collectFiles(
  dir: string,
  root: string,
  depth: number,
): Promise<Array<{ fullPath: string; relPath: string }>> {
  if (depth > MAX_DEPTH) return [];
  const results: Array<{ fullPath: string; relPath: string }> = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        results.push(...await collectFiles(fullPath, root, depth + 1));
      } else {
        const relPath = relative(root, fullPath).replace(/\\/g, '/');
        results.push({ fullPath, relPath });
      }
    }
  } catch {
    // Skip unreadable
  }

  return results;
}

function ok(output: string): ToolResult {
  return { toolCallId: '', name: 'Grep', output, isError: false, durationMs: 0 };
}
function err(msg: string): ToolResult {
  return { toolCallId: '', name: 'Grep', output: msg, isError: true, durationMs: 0 };
}

void stat;
