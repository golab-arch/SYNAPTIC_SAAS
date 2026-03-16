/**
 * EnforcementEngine — Motor 1 main class.
 * Orchestrates the 4-layer enforcement pipeline.
 */

import type {
  IEnforcementEngine,
  EnforcementConfig,
  EnforcementValidationResult,
  Violation,
  ComplianceReport,
  ComplianceHistoryEntry,
} from './types.js';
import { validateResponse, calculateValidationScore } from './response-validator.js';
import { checkTemplate } from './template-checker.js';
import { calculateComplianceMetrics, buildComplianceReport, scoreToGrade } from './compliance-scorer.js';
import { scoreDecisionGate, detectDecisionGate } from './decision-gate-utils.js';
import { buildRegenerationMessage } from './regeneration-engine.js';

export class EnforcementEngine implements IEnforcementEngine {
  private config!: EnforcementConfig;
  private history: ComplianceHistoryEntry[] = [];

  async initialize(config: EnforcementConfig): Promise<void> {
    this.config = config;
  }

  async dispose(): Promise<void> {
    this.history = [];
  }

  getSessionInitPrompt(): string {
    return [
      '# SYNAPTIC PROTOCOL ENFORCEMENT',
      '',
      `Mode: ${this.config.mode}`,
      `Minimum compliance score: ${this.config.thresholds.minScore}%`,
      `Rejection threshold: ${this.config.thresholds.rejectBelow}%`,
      '',
      'You MUST format every response following the SYNAPTIC template:',
      '1. SYNAPTIC PROTOCOL v3.0 header',
      '2. SYSTEM STATE section (Project, Cycle, Phase, Synaptic Strength, Enforcement)',
      '3. CONTEXT VERIFICATION section',
      '4. REQUIREMENT ANALYSIS section',
      '5. MANDATORY DECISION GATE with Options A, B, C (each with description, pros, cons, risk, confidence)',
      '6. AWAITING DECISION text',
      '7. END OF RESPONSE marker',
      '',
      'NEVER generate code before presenting a Decision Gate.',
      'ALWAYS wait for explicit user selection before implementing.',
    ].join('\n');
  }

  wrapPrompt(userPrompt: string, cycle: number, loadedFiles: string[]): string {
    return [
      '[ENFORCE-SYNAPTIC-PROTOCOL]',
      `Cycle: ${cycle}`,
      `Mode: ${this.config.mode}`,
      `Loaded files: ${loadedFiles.join(', ')}`,
      '',
      'SELF-CHECK BEFORE RESPONDING:',
      '□ Response includes SYNAPTIC PROTOCOL v3.0 header',
      '□ SYSTEM STATE section present with Project, Cycle, Strength',
      '□ CONTEXT VERIFICATION section present',
      '□ Decision Gate with 3 options (A/B/C) if architectural decision',
      '□ No code before Decision Gate approval',
      '□ AWAITING DECISION text present',
      '',
      'USER PROMPT:',
      userPrompt,
      '[/ENFORCE-SYNAPTIC-PROTOCOL]',
    ].join('\n');
  }

  validate(response: string): EnforcementValidationResult {
    // Layer 3a: Run 7 structural checks
    const validation = validateResponse(response);
    const validationScore = calculateValidationScore(validation.violations);

    // Layer 3b: Check template sections
    const templateCheck = checkTemplate(response, this.config.templateSections);

    // Layer 3c: Score Decision Gate
    const gate = detectDecisionGate(response);
    const decisionGateScore = scoreDecisionGate(gate);

    // Layer 3d: Calculate 5 weighted metrics
    // For memory/bitacora/session scores, use 100 as default (no penalty if not applicable)
    const complianceMetrics = calculateComplianceMetrics(
      templateCheck.score,
      decisionGateScore,
      100, // memory score — fully tracked once intelligence is connected
      100, // bitacora score
      100, // session score
      this.config.weights,
    );

    // Combine: use the lower of validation score and weighted compliance
    const combinedScore = Math.min(validationScore, complianceMetrics.weightedTotal);
    const grade = scoreToGrade(combinedScore);
    const valid = combinedScore >= this.config.thresholds.rejectBelow;

    // Merge all violations
    const allViolations: Violation[] = [...validation.violations];

    // Add template violations for missing required sections
    for (const detail of templateCheck.details) {
      if (detail.required && !detail.found) {
        const existing = allViolations.find((v) => v.section === detail.name);
        if (!existing) {
          allViolations.push({
            id: `V-TPL-${detail.sectionId}`,
            section: detail.name,
            severity: detail.severity,
            description: `Missing template section: ${detail.name}`,
            penalty: 10,
          });
        }
      }
    }

    // Record in history
    this.history.push({
      cycle: this.history.length + 1,
      score: combinedScore,
      grade,
      violations: allViolations.length,
      timestamp: new Date().toISOString(),
    });

    return { valid, score: combinedScore, grade, violations: allViolations, templateCheck, complianceMetrics };
  }

  buildRegenerationMessage(
    violations: Violation[],
    attempt: number,
    maxAttempts: number,
  ): string {
    return buildRegenerationMessage(violations, attempt, maxAttempts);
  }

  getComplianceReport(): ComplianceReport {
    const latest = this.history[this.history.length - 1];
    return buildComplianceReport(
      this.history,
      latest?.score ?? 100,
      latest?.grade ?? 'A',
    );
  }

  getComplianceHistory(): ComplianceHistoryEntry[] {
    return [...this.history];
  }
}
