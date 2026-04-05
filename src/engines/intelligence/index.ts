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
export { detectDGSelection, parseDecisionGateFromResponse } from './dg-selection-detector.js';
export { CycleContextManager } from './cycle-context-manager.js';
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
  BitacoraFragment,
  ContextDocument,
  IntelligenceSummary,
  SynapticSession,
  IIntelligenceStorage,
} from './types.js';
