/**
 * SAI Check 4: Naming convention consistency.
 * Verifies: camelCase for functions/variables, PascalCase for classes/types/interfaces.
 * 100% deterministic — regex only.
 */

import type { Finding } from '../types.js';

const CLASS_DECL_RE = /(?:export\s+)?class\s+(\w+)/g;
const INTERFACE_DECL_RE = /(?:export\s+)?interface\s+(\w+)/g;
const TYPE_DECL_RE = /(?:export\s+)?type\s+(\w+)\s*=/g;
const FUNCTION_DECL_RE = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;

const PASCAL_CASE_RE = /^[A-Z][a-zA-Z0-9]*$/;
const CAMEL_CASE_RE = /^[a-z][a-zA-Z0-9]*$/;
const UPPER_SNAKE_RE = /^[A-Z][A-Z0-9_]*$/;

export function checkConsistency(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  // Classes should be PascalCase
  checkPattern(content, path, CLASS_DECL_RE, PASCAL_CASE_RE, 'Class', 'PascalCase', findings);

  // Interfaces should be PascalCase
  checkPattern(content, path, INTERFACE_DECL_RE, PASCAL_CASE_RE, 'Interface', 'PascalCase', findings);

  // Types should be PascalCase
  checkPattern(content, path, TYPE_DECL_RE, PASCAL_CASE_RE, 'Type', 'PascalCase', findings);

  // Functions should be camelCase (allow PascalCase for React components and UPPER_SNAKE for constants)
  FUNCTION_DECL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FUNCTION_DECL_RE.exec(content)) !== null) {
    const name = match[1]!;
    if (!CAMEL_CASE_RE.test(name) && !PASCAL_CASE_RE.test(name) && !UPPER_SNAKE_RE.test(name)) {
      const line = content.substring(0, match.index).split('\n').length;
      findings.push({
        id: `sai-consistency-${path}-${line}-${name}`,
        type: 'consistency',
        severity: 'LOW',
        file: path,
        line,
        description: `Function '${name}' does not follow camelCase or PascalCase convention`,
        suggestion: `Rename '${name}' to follow camelCase (e.g., '${toCamelCase(name)}').`,
        status: 'OPEN',
        detectedInCycle: 0,
      });
    }
  }

  return findings;
}

function checkPattern(
  content: string,
  path: string,
  declRegex: RegExp,
  conventionRegex: RegExp,
  kind: string,
  convention: string,
  findings: Finding[],
): void {
  declRegex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = declRegex.exec(content)) !== null) {
    const name = match[1]!;
    if (!conventionRegex.test(name)) {
      const line = content.substring(0, match.index).split('\n').length;
      findings.push({
        id: `sai-consistency-${path}-${line}-${name}`,
        type: 'consistency',
        severity: 'LOW',
        file: path,
        line,
        description: `${kind} '${name}' does not follow ${convention} convention`,
        suggestion: `Rename '${name}' to follow ${convention}.`,
        status: 'OPEN',
        detectedInCycle: 0,
      });
    }
  }
}

function toCamelCase(name: string): string {
  return name
    .replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}
