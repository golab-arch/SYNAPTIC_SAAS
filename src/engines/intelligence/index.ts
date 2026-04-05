/**
 * Intelligence Engine — Motor 3 public API.
 */

export { IntelligenceEngine } from './intelligence-engine.js';
export { detectContradictions } from './contradiction-detector.js';
export {
  getInitialScore,
  reinforce,
  applyDecayToLearning,
  filterForInjection,
  findSimilarLearning,
} from './confidence-system.js';
export { detectInferredLearnings } from './learning-detectors.js';
export type { ToolActionSummary } from './learning-detectors.js';
export { detectDGSelection, detectDGSelectionAsync, getMicroCallModel, parseDecisionGateFromResponse, MICRO_CALL_MODELS } from './dg-selection-detector.js';
export { CycleContextManager } from './cycle-context-manager.js';
export { EnforcementTracker } from './enforcement-tracker.js';
export { shouldRunEnrichment, runS4Enrichment, buildS4Prompt, applyS4Actions } from './s4-enrichment.js';
export {
  CONTRADICTION_CATEGORIES,
  INITIAL_CONFIDENCE,
  REINFORCEMENT_INCREMENT,
  DECAY_CONFIG,
  DEFAULT_INTELLIGENCE_CONFIG,
} from './constants.js';
export type {
  IIntelligenceEngine,
  IntelligenceConfig,
  DecisionRecord,
  DecisionOption,
  LearningEntry,
  ConfidenceSource,
  Contradiction,
  ContradictionCategory,
  BitacoraCycleEntry,
  BitacoraIndex,
  TomeEntry,
  DecisionIndexEntry,
  BitacoraAggregateMetrics,
  ContextDocument,
  IntelligenceSummary,
  SynapticSession,
  IIntelligenceStorage,
} from './types.js';
