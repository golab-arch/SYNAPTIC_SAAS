/**
 * Enforcement Engine — Motor 1 public API.
 */

export { EnforcementEngine } from './enforcement-engine.js';
export type {
  IEnforcementEngine,
  EnforcementConfig,
  EnforcementValidationResult,
  Violation,
  TemplateSectionDefinition,
  TemplateCheckResult,
  TemplateSectionResult,
  ComplianceMetrics,
  ComplianceReport,
  ComplianceHistoryEntry,
} from './types.js';
export {
  DEFAULT_ENFORCEMENT_CONFIG,
  SYNAPTIC_DEFAULT_TEMPLATE,
  SEVERITY_PENALTIES,
  GRADE_THRESHOLDS,
  scoreToGrade,
  DEFAULT_WEIGHTS,
  VALIDATION_CHECKS,
} from './constants.js';
