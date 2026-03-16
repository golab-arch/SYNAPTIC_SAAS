/**
 * SAI Engine — Motor 2 public API.
 */

export { SAIEngine } from './sai-engine.js';
export { DEFAULT_SAI_CHECKLIST } from './checklist/index.js';
export { checkSecuritySecrets } from './checklist/security-secrets.js';
export { checkSecurityInjection } from './checklist/security-injection.js';
export type {
  ISAIEngine,
  SAIConfig,
  SAIChecklistItem,
  SAIAuditResult,
  FileContent,
  Finding,
  ResolvedFinding,
  SAICycleEntry,
  TrendAnalysis,
  SAIAuditSummary,
  ISAIStorage,
} from './types.js';
