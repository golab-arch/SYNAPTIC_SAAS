/**
 * Glob tool — find files matching a pattern.
 */

import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { ToolResult } from '../types.js';
import type { PathValidator } from '../path-validator.js';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.next']);
const MAX_RESULTS = 100;
const MAX_DEPTH = 10;

export async function globTool(
  input: { pattern: string; path?: string },
  pv: PathValidator,
): Promise<ToolResult> {
  const base = input.path ?? '.';
  const v = pv.validate(base);
  if (!v.valid) return err(v.error!);

  try {
    const matches = await walkDir(v.resolved, input.pattern, pv.getRoot(), 0);
    const limited = matches.slice(0, MAX_RESULTS);
    const output = limited.join('\n') +
      (matches.length > MAX_RESULTS ? `\n... and ${matches.length - MAX_RESULTS} more` : '');
    return ok(output || 'No matches found');
  } catch (e) {
    return err(`Glob error: ${e instanceof Error ? e.message : e}`);
  }
}

async function walkDir(dir: string, pattern: string, root: string, depth: number): Promise<string[]> {
  if (depth > MAX_DEPTH) return [];
  const results: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const regex = globToRegex(pattern);

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      const relPath = relative(root, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        const sub = await walkDir(fullPath, pattern, root, depth + 1);
        results.push(...sub);
      } else if (regex.test(relPath) || regex.test(entry.name)) {
        results.push(relPath);
      }

      if (results.length >= MAX_RESULTS * 2) break;
    }
  } catch {
    // Skip unreadable directories
  }

  return results;
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function ok(output: string): ToolResult {
  return { toolCallId: '', name: 'Glob', output, isError: false, durationMs: 0 };
}
function err(msg: string): ToolResult {
  return { toolCallId: '', name: 'Glob', output: msg, isError: true, durationMs: 0 };
}

// suppress unused import warning
void stat;
