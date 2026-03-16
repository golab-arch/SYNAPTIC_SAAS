/**
 * SAI Check 1: Unused imports detection.
 * Parses import declarations and verifies each identifier is used in the file body.
 * 100% deterministic — regex only, no LLM.
 */

import type { Finding } from '../types.js';

const NAMED_IMPORT_RE = /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"][^'"]+['"]/g;
const DEFAULT_IMPORT_RE = /import\s+(\w+)\s+from\s+['"][^'"]+['"]/g;
const SIDE_EFFECT_IMPORT_RE = /import\s+['"][^'"]+['"]/;

export function checkUnusedImports(content: string, path: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split('\n');

  // Find where imports end (first non-import, non-blank, non-comment line)
  let importEndLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (
      trimmed === '' ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('}')
    ) {
      importEndLine = i + 1;
    } else {
      break;
    }
  }

  const bodyContent = lines.slice(importEndLine).join('\n');

  // Check named imports: import { A, B, C } from '...'
  NAMED_IMPORT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NAMED_IMPORT_RE.exec(content)) !== null) {
    const importLine = content.substring(0, match.index).split('\n').length;
    const identifiers = match[1]!
      .split(',')
      .map((id) => id.trim())
      .map((id) => id.includes(' as ') ? id.split(' as ')[1]!.trim() : id)
      .filter((id) => id.length > 0);

    for (const id of identifiers) {
      // Check if identifier is used in body (not in import section)
      const usageRe = new RegExp(`\\b${escapeRegex(id)}\\b`);
      if (!usageRe.test(bodyContent)) {
        findings.push({
          id: `sai-unused-import-${path}-${importLine}-${id}`,
          type: 'dead_code',
          severity: 'MEDIUM',
          file: path,
          line: importLine,
          description: `Unused import: '${id}'`,
          suggestion: `Remove unused import '${id}' or use it in the code.`,
          status: 'OPEN',
          detectedInCycle: 0,
        });
      }
    }
  }

  // Check default imports: import Foo from '...'
  DEFAULT_IMPORT_RE.lastIndex = 0;
  while ((match = DEFAULT_IMPORT_RE.exec(content)) !== null) {
    // Skip side-effect imports
    if (SIDE_EFFECT_IMPORT_RE.test(match[0]!)) continue;

    const importLine = content.substring(0, match.index).split('\n').length;
    const id = match[1]!;

    const usageRe = new RegExp(`\\b${escapeRegex(id)}\\b`);
    if (!usageRe.test(bodyContent)) {
      findings.push({
        id: `sai-unused-import-${path}-${importLine}-${id}`,
        type: 'dead_code',
        severity: 'MEDIUM',
        file: path,
        line: importLine,
        description: `Unused default import: '${id}'`,
        suggestion: `Remove unused import '${id}' or use it in the code.`,
        status: 'OPEN',
        detectedInCycle: 0,
      });
    }
  }

  return findings;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
