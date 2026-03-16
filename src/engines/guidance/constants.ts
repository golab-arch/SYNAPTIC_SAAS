/**
 * Guidance Engine constants.
 */

export const DEFAULT_PRIORITY_WEIGHTS = {
  urgency: 0.4,
  dependency: 0.35,
  complexity: 0.25,
} as const;

export const MAX_SUGGESTIONS = 5;

export const SUGGESTION_CATEGORIES = [
  'feature', 'fix', 'refactor', 'test', 'docs', 'config',
] as const;

export const EFFORT_LEVELS = ['small', 'medium', 'large'] as const;
