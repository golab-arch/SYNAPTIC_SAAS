/**
 * Enforcement constants — FULLY IMPLEMENTED.
 * Thresholds, penalties, grades, weights, and default template sections.
 */

import type { Severity, Grade } from '../types.js';
import type { TemplateSectionDefinition, EnforcementConfig } from './types.js';

// ─── Severity Penalties ─────────────────────────────────────────

export const SEVERITY_PENALTIES: Record<Severity, number> = {
  CRITICAL: -25,
  HIGH: -15,
  MEDIUM: -10,
  LOW: -5,
};

// ─── Grade Thresholds ───────────────────────────────────────────

export const GRADE_THRESHOLDS: { grade: Grade; minScore: number }[] = [
  { grade: 'A', minScore: 90 },
  { grade: 'B', minScore: 75 },
  { grade: 'C', minScore: 60 },
  { grade: 'D', minScore: 40 },
  { grade: 'F', minScore: 0 },
];

export function scoreToGrade(score: number): Grade {
  for (const { grade, minScore } of GRADE_THRESHOLDS) {
    if (score >= minScore) return grade;
  }
  return 'F';
}

// ─── Compliance Weights ─────────────────────────────────────────

export const DEFAULT_WEIGHTS = {
  template: 0.40,
  decisionGate: 0.25,
  memory: 0.15,
  bitacora: 0.10,
  session: 0.10,
} as const;

// ─── Enforcement Modes ──────────────────────────────────────────

export const MODE_THRESHOLDS = {
  STRICT: { minScore: 90, rejectBelow: 70 },
  BALANCED: { minScore: 75, rejectBelow: 50 },
  ADAPTIVE: { minScore: 60, rejectBelow: 40 },
} as const;

// ─── Regeneration ───────────────────────────────────────────────

export const MAX_REGENERATION_ATTEMPTS = 5;

export const REGENERATION_TEMPLATES = {
  NO_CODE: 'Your response contained direct code implementation without a Decision Gate. Rewrite providing 3 options (A/B/C) BEFORE any code.',
  DECISION_GATE: 'Your response is missing a proper Decision Gate. Include exactly 3 options with description, pros, cons, time estimate, risk level, and confidence percentage.',
  MISSING_SECTIONS: 'Your response is missing required SYNAPTIC template sections: {sections}. Rewrite including ALL required sections.',
  GENERIC: 'Your response scored {score}% (minimum: {threshold}%). Violations: {violations}. Please reformulate following the SYNAPTIC protocol template exactly.',
} as const;

// ─── Default Template Sections (the 8 classic SYNAPTIC sections) ─

export const SYNAPTIC_DEFAULT_TEMPLATE: TemplateSectionDefinition[] = [
  {
    id: 'HEADER',
    name: 'Protocol Header',
    pattern: /SYNAPTIC PROTOCOL v[\d.]+/i,
    required: true,
    severity: 'CRITICAL',
  },
  {
    id: 'SYSTEM_STATE',
    name: 'System State',
    pattern: /SYSTEM STATE/i,
    required: true,
    severity: 'HIGH',
    subsections: [
      { pattern: /Project[:\s]+[\w-]+/i, required: true },
      { pattern: /Cycle[:\s]+\d+/i, required: true },
      { pattern: /Synaptic\s*Strength[:\s]+\d+%/i, required: true },
    ],
  },
  {
    id: 'CONTEXT_VERIFICATION',
    name: 'Context Verification',
    pattern: /CONTEXT VERIFICATION/i,
    required: true,
    severity: 'HIGH',
  },
  {
    id: 'REQUIREMENT_ANALYSIS',
    name: 'Requirement Analysis',
    pattern: /REQUIREMENT ANALYSIS/i,
    required: true,
    severity: 'MEDIUM',
  },
  {
    id: 'PHASE',
    name: 'Phase Section',
    pattern: /PHASE\s+\d+/i,
    required: false,
    severity: 'LOW',
  },
  {
    id: 'DECISION_GATE',
    name: 'Decision Gate',
    pattern: /DECISION GATE|MANDATORY DECISION/i,
    required: true,
    severity: 'CRITICAL',
    subsections: [
      { pattern: /OPTION A/i, required: true },
      { pattern: /OPTION B/i, required: true },
      { pattern: /OPTION C/i, required: true },
    ],
  },
  {
    id: 'AWAITING_DECISION',
    name: 'Awaiting Decision',
    pattern: /AWAITING DECISION|AWAITING HUMAN INPUT/i,
    required: true,
    severity: 'HIGH',
  },
  {
    id: 'END_MARKER',
    name: 'End Marker',
    pattern: /END OF RESPONSE|ENFORCEMENT ACTIVE/i,
    required: false,
    severity: 'LOW',
  },
];

// ─── 7 Response Validation Checks ───────────────────────────────

export const VALIDATION_CHECKS = {
  HAS_PROTOCOL_HEADER: /SYNAPTIC PROTOCOL v[\d.]+/i,
  HAS_SYSTEM_STATE: /##\s*SYSTEM STATE/i,
  HAS_CONTEXT_VERIFICATION: /##\s*CONTEXT VERIFICATION/i,
  HAS_DECISION_GATE: /##\s*(MANDATORY\s+)?DECISION GATE/i,
  HAS_THREE_OPTIONS: /OPTION [ABC]/gi,
  HAS_AWAITING_DECISION: /AWAITING (DECISION|HUMAN INPUT)/i,
  NO_DIRECT_CODE_BEFORE_GATE: /```[\s\S]*?```[\s\S]*?DECISION GATE/i,
} as const;

// ─── Default Config ─────────────────────────────────────────────

export const DEFAULT_ENFORCEMENT_CONFIG: EnforcementConfig = {
  mode: 'STRICT',
  thresholds: MODE_THRESHOLDS.STRICT,
  weights: DEFAULT_WEIGHTS,
  maxRegenerationAttempts: MAX_REGENERATION_ATTEMPTS,
  templateSections: SYNAPTIC_DEFAULT_TEMPLATE,
};
