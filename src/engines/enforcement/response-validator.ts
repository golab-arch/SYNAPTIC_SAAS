/**
 * ResponseValidator — 7 structural checks via regex.
 * 100% deterministic — no LLM involved.
 */

import type { Violation, TemplateSectionDefinition } from './types.js';
import { VALIDATION_CHECKS, SEVERITY_PENALTIES } from './constants.js';

export interface ResponseValidationResult {
  readonly passed: boolean;
  readonly violations: Violation[];
  readonly checksRun: number;
  readonly checksPassed: number;
}

interface CheckDef {
  readonly id: string;
  readonly name: string;
  readonly pattern: RegExp;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  readonly minMatches?: number;
}

const CHECKS: CheckDef[] = [
  {
    id: 'PROTOCOL_HEADER',
    name: 'Protocol Header',
    pattern: VALIDATION_CHECKS.HAS_PROTOCOL_HEADER,
    severity: 'CRITICAL',
  },
  {
    id: 'SYSTEM_STATE',
    name: 'System State Section',
    pattern: VALIDATION_CHECKS.HAS_SYSTEM_STATE,
    severity: 'HIGH',
  },
  {
    id: 'CONTEXT_VERIFICATION',
    name: 'Context Verification Section',
    pattern: VALIDATION_CHECKS.HAS_CONTEXT_VERIFICATION,
    severity: 'HIGH',
  },
  {
    id: 'DECISION_GATE',
    name: 'Decision Gate Section',
    pattern: VALIDATION_CHECKS.HAS_DECISION_GATE,
    severity: 'CRITICAL',
  },
  {
    id: 'THREE_OPTIONS',
    name: 'Three Options (A/B/C)',
    pattern: VALIDATION_CHECKS.HAS_THREE_OPTIONS,
    severity: 'CRITICAL',
    minMatches: 3,
  },
  {
    id: 'AWAITING_DECISION',
    name: 'Awaiting Decision',
    pattern: VALIDATION_CHECKS.HAS_AWAITING_DECISION,
    severity: 'HIGH',
  },
];

/**
 * Run 7 structural checks on an LLM response.
 * Returns score (100 - sum of penalties) and violations.
 */
export function validateResponse(response: string): ResponseValidationResult {
  const violations: Violation[] = [];
  let checksPassed = 0;

  for (const check of CHECKS) {
    // Reset regex state for global patterns
    check.pattern.lastIndex = 0;

    let found: boolean;
    if (check.minMatches) {
      const matches = response.match(check.pattern);
      found = (matches?.length ?? 0) >= check.minMatches;
    } else {
      found = check.pattern.test(response);
    }

    if (found) {
      checksPassed++;
    } else {
      violations.push({
        id: `V-${check.id}`,
        section: check.name,
        severity: check.severity,
        description: `Missing required element: ${check.name}`,
        penalty: Math.abs(SEVERITY_PENALTIES[check.severity]),
      });
    }
  }

  // Check 7: No direct code before decision gate (inverted — violation if code IS before gate)
  const codeBeforeGate = VALIDATION_CHECKS.NO_DIRECT_CODE_BEFORE_GATE;
  codeBeforeGate.lastIndex = 0;
  if (codeBeforeGate.test(response)) {
    violations.push({
      id: 'V-CODE_BEFORE_GATE',
      section: 'Code Placement',
      severity: 'HIGH',
      description: 'Code block found before Decision Gate — present options before implementation',
      penalty: Math.abs(SEVERITY_PENALTIES.HIGH),
    });
  } else {
    checksPassed++;
  }

  const totalChecks = CHECKS.length + 1; // +1 for code-before-gate
  const passed = violations.length === 0;

  return { passed, violations, checksRun: totalChecks, checksPassed };
}

/**
 * Calculate a score from validation violations.
 * Starts at 100, subtracts penalties for each violation.
 */
export function calculateValidationScore(violations: Violation[]): number {
  const totalPenalty = violations.reduce((sum, v) => sum + v.penalty, 0);
  return Math.max(0, 100 - totalPenalty);
}

// Re-export for template checker usage
export type { TemplateSectionDefinition };
