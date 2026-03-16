/**
 * SAI Check 2: Unused functions detection.
 * Detects function/const declarations, checks if they are called or exported.
 * Exported functions are always considered "used".
 * 100% deterministic — regex only.
 */

import type { Finding } from '../types.js';

const FUNCTION_DECL_RE = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm;
const CONST_FUNC_RE = /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/gm;
const ARROW_FUNC_RE = /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*\w[^=]*)?=>/gm;
const EXPORT_RE = /^export\s+/;

export function checkUnusedFunctions(content: string, path: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split('\n');

  const declarations: { name: string; line: number; exported: boolean }[] = [];

  // Collect function declarations
  for (const regex of [FUNCTION_DECL_RE, CONST_FUNC_RE, ARROW_FUNC_RE]) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const lineText = lines[lineNum - 1] ?? '';
      declarations.push({
        name: match[1]!,
        line: lineNum,
        exported: EXPORT_RE.test(lineText),
      });
    }
  }

  // Check each non-exported function for usage
  for (const decl of declarations) {
    if (decl.exported) continue; // Exported functions may be used externally

    // Count occurrences of the function name in the file (excluding declaration line)
    const usageRe = new RegExp(`\\b${decl.name}\\b`, 'g');
    const allMatches = content.match(usageRe);
    const totalOccurrences = allMatches?.length ?? 0;

    // If only found once (the declaration itself), it's unused
    if (totalOccurrences <= 1) {
      findings.push({
        id: `sai-unused-func-${path}-${decl.line}-${decl.name}`,
        type: 'dead_code',
        severity: 'MEDIUM',
        file: path,
        line: decl.line,
        description: `Unused function: '${decl.name}' is declared but never called`,
        suggestion: `Remove unused function '${decl.name}' or export it if used externally.`,
        status: 'OPEN',
        detectedInCycle: 0,
      });
    }
  }

  return findings;
}
