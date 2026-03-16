/**
 * SAI Check 8: File size limit (<500 LOC).
 */

import type { Finding } from '../types.js';
import { SAI_MAX_FILE_LINES } from '../constants.js';

export function checkFileSize(content: string, path: string): Finding[] {
  const lineCount = content.split('\n').length;

  if (lineCount > SAI_MAX_FILE_LINES) {
    return [
      {
        id: `sai-filesize-${path}`,
        type: 'maintainability',
        severity: 'MEDIUM',
        file: path,
        description: `File has ${lineCount} lines (limit: ${SAI_MAX_FILE_LINES}). Consider splitting into smaller modules.`,
        suggestion: `Split this file into smaller, focused modules. Target <${SAI_MAX_FILE_LINES} lines per file.`,
        status: 'OPEN',
        detectedInCycle: 0,
      },
    ];
  }

  return [];
}
