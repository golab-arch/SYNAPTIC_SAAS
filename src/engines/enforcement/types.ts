/**
 * Enforcement Engine types — Motor 1.
 * Deterministic Output Validation: transforms probabilistic LLM output
 * into validated, protocol-compliant responses.
 */

import type { Severity, Grade, IEngine } from '../types.js';

// ─── Configuration ──────────────────────────────────────────────

export interface EnforcementConfig {
  readonly mode: 'STRICT' | 'BALANCED' | 'ADAPTIVE';
  readonly thresholds: {
    readonly minScore: number;
    readonly rejectBelow: number;
  };
  readonly weights: {
    readonly template: number;
    readonly decisionGate: number;
    readonly memory: number;
    readonly bitacora: number;
    readonly session: number;
  };
  readonly maxRegenerationAttempts: number;
  readonly templateSections: TemplateSectionDefinition[];
}

export interface TemplateSectionDefinition {
  readonly id: string;
  readonly name: string;
  readonly pattern: RegExp;
  readonly required: boolean;
  readonly severity: Severity;
  readonly subsections?: readonly { pattern: RegExp; required: boolean }[];
}

// ─── Validation Results ─────────────────────────────────────────

export interface EnforcementValidationResult {
  readonly valid: boolean;
  readonly score: number;
  readonly grade: Grade;
  readonly violations: Violation[];
  readonly templateCheck: TemplateCheckResult;
  readonly complianceMetrics: ComplianceMetrics;
}

export interface Violation {
  readonly id: string;
  readonly section: string;
  readonly severity: Severity;
  readonly description: string;
  readonly penalty: number;
}

export interface TemplateCheckResult {
  readonly sectionsFound: number;
  readonly sectionsRequired: number;
  readonly score: number;
  readonly details: TemplateSectionResult[];
}

export interface TemplateSectionResult {
  readonly sectionId: string;
  readonly name: string;
  readonly found: boolean;
  readonly required: boolean;
  readonly severity: Severity;
  readonly subsectionsFound: number;
  readonly subsectionsRequired: number;
}

export interface ComplianceMetrics {
  readonly templateScore: number;
  readonly decisionGateScore: number;
  readonly memoryScore: number;
  readonly bitacoraScore: number;
  readonly sessionScore: number;
  readonly weightedTotal: number;
}

// ─── Compliance Tracking ────────────────────────────────────────

export interface ComplianceReport {
  readonly currentScore: number;
  readonly grade: Grade;
  readonly trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  readonly cyclesTracked: number;
  readonly averageScore: number;
  readonly violationsByType: Record<string, number>;
}

export interface ComplianceHistoryEntry {
  readonly cycle: number;
  readonly score: number;
  readonly grade: Grade;
  readonly violations: number;
  readonly timestamp: string;
}

// ─── Engine Interface ───────────────────────────────────────────

export interface IEnforcementEngine extends IEngine {
  /** Initialize with enforcement configuration */
  initialize(config: EnforcementConfig): Promise<void>;

  /** Layer 1: Get session initialization prompt */
  getSessionInitPrompt(): string;

  /** Layer 2: Wrap user prompt with enforcement markers */
  wrapPrompt(userPrompt: string, cycle: number, loadedFiles: string[]): string;

  /** Layer 3: Validate LLM response against protocol */
  validate(response: string): EnforcementValidationResult;

  /** Layer 4: Build regeneration message for non-compliant responses */
  buildRegenerationMessage(
    violations: Violation[],
    attempt: number,
    maxAttempts: number,
  ): string;

  /** Get current compliance report */
  getComplianceReport(): ComplianceReport;

  /** Get compliance history across cycles */
  getComplianceHistory(): ComplianceHistoryEntry[];
}
