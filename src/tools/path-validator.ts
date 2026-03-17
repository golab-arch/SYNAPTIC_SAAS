/**
 * PathValidator — ensures all file operations stay within the workspace.
 * Prevents path traversal, blocks sensitive files.
 */

import { resolve, normalize, relative } from 'node:path';

const BLOCKED_PATTERNS = ['.env', '.git/config', '.git/credentials'];

export class PathValidator {
  private readonly root: string;

  constructor(workspaceRoot: string) {
    this.root = resolve(normalize(workspaceRoot));
  }

  validate(filePath: string): { valid: boolean; resolved: string; error?: string } {
    const resolved = resolve(this.root, normalize(filePath));
    const rel = relative(this.root, resolved);

    // Path traversal: relative must not escape root
    if (rel.startsWith('..') || rel.startsWith('/') || rel.startsWith('\\')) {
      return { valid: false, resolved, error: `Path escapes workspace: ${filePath}` };
    }

    // Block sensitive paths (normalize separators for cross-platform)
    const relNorm = rel.replace(/\\/g, '/');
    for (const pattern of BLOCKED_PATTERNS) {
      if (relNorm === pattern || relNorm.startsWith(pattern + '/')) {
        return { valid: false, resolved, error: `Blocked path: ${pattern}` };
      }
    }

    return { valid: true, resolved };
  }

  getRoot(): string {
    return this.root;
  }
}
