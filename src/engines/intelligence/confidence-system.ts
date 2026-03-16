/**
 * Confidence System — scoring, reinforcement, decay, auto-promotion, dedup.
 * FUNCTIONAL implementation.
 */

import type { LearningEntry, ConfidenceSource } from './types.js';
import {
  INITIAL_CONFIDENCE,
  REINFORCEMENT_INCREMENT,
  AUTO_PROMOTION_THRESHOLD,
  DECAY_CONFIG,
} from './constants.js';

/**
 * Calculate initial confidence score for a new learning.
 */
export function getInitialScore(source: ConfidenceSource): number {
  return INITIAL_CONFIDENCE[source];
}

/**
 * Reinforce a learning's confidence when re-observed.
 * Cap at 1.0. Check for auto-promotion.
 */
export function reinforce(
  learning: LearningEntry,
  source: ConfidenceSource,
  currentCycle: number,
): void {
  const increment = REINFORCEMENT_INCREMENT[source];
  learning.confidence.score = Math.min(1.0, learning.confidence.score + increment);
  learning.confidence.evidenceCount += 1;
  learning.confidence.lastReinforced = new Date().toISOString();
  learning.confidence.lastReinforcedCycle = currentCycle;

  // Auto-promotion: INFERRED → REPEATED
  if (
    learning.confidence.source === 'INFERRED' &&
    learning.confidence.evidenceCount >= AUTO_PROMOTION_THRESHOLD.minObservations &&
    learning.confidence.score >= AUTO_PROMOTION_THRESHOLD.minScore
  ) {
    learning.confidence.source = 'REPEATED';
  }
}

/**
 * Apply temporal decay to a learning.
 * Returns true if the learning should be archived.
 */
export function applyDecayToLearning(learning: LearningEntry, currentCycle: number): boolean {
  const cyclesSinceReinforcement = currentCycle - learning.confidence.lastReinforcedCycle;

  if (cyclesSinceReinforcement <= DECAY_CONFIG.gracePeriod) {
    return false; // Still in grace period
  }

  const decayCycles = cyclesSinceReinforcement - DECAY_CONFIG.gracePeriod;
  const decay = decayCycles * DECAY_CONFIG.decayRate;
  learning.confidence.score = Math.max(0, learning.confidence.score - decay);

  return learning.confidence.score < DECAY_CONFIG.archiveThreshold;
}

/**
 * Filter learnings for prompt injection (confidence >= threshold).
 */
export function filterForInjection(
  learnings: LearningEntry[],
  threshold: number,
  maxItems: number,
): LearningEntry[] {
  return learnings
    .filter((l) => l.confidence.score >= threshold)
    .sort((a, b) => b.confidence.score - a.confidence.score)
    .slice(0, maxItems);
}

/**
 * Find a similar existing learning for dedup.
 * Uses exact content match, substring match, and Jaccard word similarity (>50%).
 */
export function findSimilarLearning(
  content: string,
  category: string,
  existing: LearningEntry[],
): LearningEntry | null {
  const newWords = new Set(tokenize(content));

  for (const learning of existing) {
    // Exact match
    if (learning.content === content && learning.category === category) {
      return learning;
    }

    // Same category + high word overlap
    if (learning.category === category) {
      const existingWords = new Set(tokenize(learning.content));
      const similarity = jaccardSimilarity(newWords, existingWords);
      if (similarity > 0.35) {
        return learning;
      }
    }
  }

  return null;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
