/**
 * Decision Gate utilities — detection, parsing, and scoring.
 */

export interface DetectedDecisionGate {
  readonly found: boolean;
  readonly optionA: string | null;
  readonly optionB: string | null;
  readonly optionC: string | null;
  readonly hasAllOptions: boolean;
  readonly hasDescriptions: boolean;
  readonly hasProsAndCons: boolean;
}

const OPTION_PATTERNS = {
  A: /(?:####?\s*)?OPTION\s+A[:\s—-]*([^\n]*)/i,
  B: /(?:####?\s*)?OPTION\s+B[:\s—-]*([^\n]*)/i,
  C: /(?:####?\s*)?OPTION\s+C[:\s—-]*([^\n]*)/i,
};

const GATE_PATTERN = /(?:MANDATORY\s+)?DECISION\s+GATE/i;
const PROS_PATTERN = /Pros?[:\s]/i;
const CONS_PATTERN = /Cons?[:\s]/i;

/**
 * Detect and parse a Decision Gate from an LLM response.
 */
export function detectDecisionGate(response: string): DetectedDecisionGate {
  const found = GATE_PATTERN.test(response);
  if (!found) {
    return {
      found: false,
      optionA: null, optionB: null, optionC: null,
      hasAllOptions: false, hasDescriptions: false, hasProsAndCons: false,
    };
  }

  const matchA = response.match(OPTION_PATTERNS.A);
  const matchB = response.match(OPTION_PATTERNS.B);
  const matchC = response.match(OPTION_PATTERNS.C);

  const optionA = matchA?.[1]?.trim() ?? null;
  const optionB = matchB?.[1]?.trim() ?? null;
  const optionC = matchC?.[1]?.trim() ?? null;

  const hasAllOptions = optionA !== null && optionB !== null && optionC !== null;
  const hasDescriptions = hasAllOptions &&
    (optionA?.length ?? 0) > 5 &&
    (optionB?.length ?? 0) > 5 &&
    (optionC?.length ?? 0) > 5;
  const hasProsAndCons = PROS_PATTERN.test(response) && CONS_PATTERN.test(response);

  return { found, optionA, optionB, optionC, hasAllOptions, hasDescriptions, hasProsAndCons };
}

/**
 * Validate that a detected Decision Gate meets all requirements.
 */
export function validateDecisionGate(gate: DetectedDecisionGate): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!gate.found) issues.push('No Decision Gate section found');
  if (!gate.hasAllOptions) issues.push('Missing one or more options (A/B/C)');
  if (!gate.hasDescriptions) issues.push('Options lack descriptions');
  if (!gate.hasProsAndCons) issues.push('Missing pros/cons analysis');

  return { valid: issues.length === 0, issues };
}

/**
 * Calculate the Decision Gate score (0-100).
 */
export function scoreDecisionGate(gate: DetectedDecisionGate): number {
  if (!gate.found) return 0;

  let score = 30; // Base for having a gate
  if (gate.hasAllOptions) score += 30;
  if (gate.hasDescriptions) score += 20;
  if (gate.hasProsAndCons) score += 20;

  return score;
}
