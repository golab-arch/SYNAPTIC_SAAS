/**
 * SAI constants — patterns, thresholds, grades.
 */

import type { Severity, Grade } from '../types.js';

export const SAI_SEVERITY_PENALTIES: Record<Severity, number> = {
  CRITICAL: -25,
  HIGH: -15,
  MEDIUM: -10,
  LOW: -5,
};

export const SAI_PASS_THRESHOLD = 70;

export const SAI_GRADE_THRESHOLDS: { grade: Grade; minScore: number }[] = [
  { grade: 'A', minScore: 90 },
  { grade: 'B', minScore: 75 },
  { grade: 'C', minScore: 60 },
  { grade: 'D', minScore: 40 },
  { grade: 'F', minScore: 0 },
];

export function saiScoreToGrade(score: number): Grade {
  for (const { grade, minScore } of SAI_GRADE_THRESHOLDS) {
    if (score >= minScore) return grade;
  }
  return 'F';
}

export const SAI_DEFAULT_EXTENSION_WHITELIST = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
];

export const SAI_DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules', 'dist', '.git', 'coverage', '.next',
];

export const SAI_MAX_FILE_SIZE = 500 * 1024; // 500KB
export const SAI_TIMEOUT = 5000; // 5s
export const SAI_MAX_FILE_LINES = 500;
