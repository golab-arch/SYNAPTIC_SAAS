/**
 * SAI Check 3: Obvious code duplication detection.
 * Compares normalized blocks of 4+ lines within the same file.
 * 100% deterministic — string comparison, no LLM.
 */

import type { Finding } from '../types.js';

const MIN_BLOCK_SIZE = 4; // Minimum lines for a duplicate block

export function checkDuplication(content: string, path: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split('\n');

  // Normalize lines: trim, collapse whitespace, skip blanks/comments
  const normalized: { text: string; originalLine: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (
      trimmed === '' ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed === '{' ||
      trimmed === '}' ||
      trimmed === '};' ||
      trimmed.startsWith('import ')
    ) {
      continue;
    }
    normalized.push({
      text: trimmed.replace(/\s+/g, ' '),
      originalLine: i + 1,
    });
  }

  // Sliding window: check if any block of MIN_BLOCK_SIZE lines appears elsewhere
  const reported = new Set<string>();

  for (let i = 0; i <= normalized.length - MIN_BLOCK_SIZE; i++) {
    const blockText = normalized
      .slice(i, i + MIN_BLOCK_SIZE)
      .map((l) => l.text)
      .join('\n');

    // Skip trivially short blocks
    if (blockText.length < 40) continue;

    for (let j = i + MIN_BLOCK_SIZE; j <= normalized.length - MIN_BLOCK_SIZE; j++) {
      const candidateText = normalized
        .slice(j, j + MIN_BLOCK_SIZE)
        .map((l) => l.text)
        .join('\n');

      if (blockText === candidateText) {
        const key = `${normalized[i]!.originalLine}-${normalized[j]!.originalLine}`;
        if (reported.has(key)) continue;
        reported.add(key);

        findings.push({
          id: `sai-duplication-${path}-${normalized[i]!.originalLine}-${normalized[j]!.originalLine}`,
          type: 'duplication',
          severity: 'LOW',
          file: path,
          line: normalized[j]!.originalLine,
          description: `Duplicate block: lines ${normalized[i]!.originalLine}-${normalized[i]!.originalLine + MIN_BLOCK_SIZE - 1} duplicated at lines ${normalized[j]!.originalLine}-${normalized[j]!.originalLine + MIN_BLOCK_SIZE - 1}`,
          suggestion: 'Extract duplicated code into a shared function or constant.',
          status: 'OPEN',
          detectedInCycle: 0,
        });

        break; // Only report first duplicate of each block
      }
    }
  }

  return findings;
}
