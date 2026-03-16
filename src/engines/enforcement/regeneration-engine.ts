/**
 * RegenerationEngine — self-healing via 4 regeneration templates.
 * Max 5 retries with specific feedback.
 */

import type { Violation } from './types.js';
import { REGENERATION_TEMPLATES } from './constants.js';

export type RegenerationType = 'NO_CODE' | 'DECISION_GATE' | 'MISSING_SECTIONS' | 'GENERIC';

/**
 * Determine which regeneration template to use based on violations.
 */
export function selectRegenerationType(violations: Violation[]): RegenerationType {
  const hasCodeViolation = violations.some((v) => v.id === 'V-CODE_BEFORE_GATE');
  if (hasCodeViolation) return 'NO_CODE';

  const hasGateViolation = violations.some(
    (v) => v.id === 'V-DECISION_GATE' || v.id === 'V-THREE_OPTIONS',
  );
  if (hasGateViolation) return 'DECISION_GATE';

  const hasSectionViolation = violations.some(
    (v) => v.id.startsWith('V-') && v.severity === 'HIGH',
  );
  if (hasSectionViolation) return 'MISSING_SECTIONS';

  return 'GENERIC';
}

/**
 * Build a regeneration message with specific feedback.
 */
export function buildRegenerationMessage(
  violations: Violation[],
  attempt: number,
  maxAttempts: number,
): string {
  const type = selectRegenerationType(violations);
  let message: string;

  switch (type) {
    case 'NO_CODE':
      message = REGENERATION_TEMPLATES.NO_CODE;
      break;
    case 'DECISION_GATE':
      message = REGENERATION_TEMPLATES.DECISION_GATE;
      break;
    case 'MISSING_SECTIONS': {
      const missing = violations.map((v) => v.section).join(', ');
      message = REGENERATION_TEMPLATES.MISSING_SECTIONS.replace('{sections}', missing);
      break;
    }
    case 'GENERIC': {
      const score = 100 - violations.reduce((s, v) => s + v.penalty, 0);
      message = REGENERATION_TEMPLATES.GENERIC
        .replace('{score}', String(Math.max(0, score)))
        .replace('{threshold}', '70')
        .replace('{violations}', violations.map((v) => v.description).join('; '));
      break;
    }
  }

  return [
    `[SYNAPTIC ENFORCEMENT — Attempt ${attempt}/${maxAttempts}]`,
    '',
    'Your previous response did NOT comply with the SYNAPTIC protocol.',
    '',
    `Violations (${violations.length}):`,
    ...violations.map((v) => `  - [${v.severity}] ${v.description} (penalty: -${v.penalty})`),
    '',
    'REQUIRED ACTION:',
    message,
    '',
    attempt >= maxAttempts - 1
      ? 'WARNING: This is your last attempt. If this fails, the response will be escalated to the user as non-compliant.'
      : `You have ${maxAttempts - attempt} attempts remaining.`,
  ].join('\n');
}
