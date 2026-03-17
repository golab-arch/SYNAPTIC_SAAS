/**
 * Bash tool — restricted command execution.
 * Whitelist-only: only explicitly allowed commands can run.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ToolResult } from '../types.js';
import type { PathValidator } from '../path-validator.js';

const execFileAsync = promisify(execFile);

const ALLOWED_COMMANDS = new Set([
  'ls', 'cat', 'head', 'tail', 'wc', 'sort', 'uniq', 'diff',
  'find', 'grep', 'echo', 'pwd', 'date', 'tree', 'mkdir',
  'node', 'npm', 'npx', 'tsc', 'vitest', 'prettier', 'eslint',
  'git',
]);

const BLOCKED_PATTERNS = [
  /rm\s+(-rf?|--recursive)/i,
  />\s*\//,
  /curl|wget/i,
  /sudo|su\s/i,
  /chmod|chown/i,
  /kill|pkill/i,
  /\beval\b/i,
  /\/etc\/|\/var\/|\/usr\//i,
];

const MAX_TIMEOUT = 60_000;
const MAX_OUTPUT = 50_000;

export async function bashTool(
  input: { command: string; timeout?: number },
  pv: PathValidator,
): Promise<ToolResult> {
  const command = input.command.trim();
  const baseCmd = command.split(/\s+/)[0]?.replace(/^\.\//, '') ?? '';

  if (!ALLOWED_COMMANDS.has(baseCmd)) {
    return err(`Command not allowed: ${baseCmd}. Allowed: ${[...ALLOWED_COMMANDS].join(', ')}`);
  }

  for (const pattern of BLOCKED_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(command)) {
      return err(`Blocked command pattern detected`);
    }
  }

  try {
    const timeout = Math.min(input.timeout ?? 30_000, MAX_TIMEOUT);
    const { stdout, stderr } = await execFileAsync('bash', ['-c', command], {
      cwd: pv.getRoot(),
      timeout,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        HOME: pv.getRoot(),
        PATH: process.env['PATH'],
      },
    });

    const output = (stdout + (stderr ? `\nSTDERR:\n${stderr}` : '')).substring(0, MAX_OUTPUT);
    return ok(output);
  } catch (e: unknown) {
    const error = e as { killed?: boolean; stderr?: string; message?: string };
    if (error.killed) return err('Command timed out');
    return err(`Command failed: ${error.stderr ?? error.message ?? 'Unknown error'}`);
  }
}

function ok(output: string): ToolResult {
  return { toolCallId: '', name: 'Bash', output, isError: false, durationMs: 0 };
}
function err(msg: string): ToolResult {
  return { toolCallId: '', name: 'Bash', output: msg, isError: true, durationMs: 0 };
}
