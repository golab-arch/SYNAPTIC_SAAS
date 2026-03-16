/**
 * Guidance Engine — Motor 4 public API.
 */

export { GuidanceEngine } from './guidance-engine.js';
export { DEFAULT_PRIORITY_WEIGHTS, MAX_SUGGESTIONS } from './constants.js';
export type {
  IGuidanceEngine,
  GuidanceConfig,
  RoadmapGuidance,
  NextStepSuggestion,
  ProjectProgress,
  PhaseProgress,
  RoadmapItem,
  IGuidanceStorage,
} from './types.js';
