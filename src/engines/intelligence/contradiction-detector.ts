/**
 * Contradiction Detector — 9 mutually exclusive categories + negation detection.
 * Adaptar de SYNAPTIC_EXPERT: packages/agent/src/services/contradiction-detector.ts
 *
 * The 9 categories are FULLY IMPLEMENTED with their technology arrays.
 */

import type { LearningEntry, Contradiction, ContradictionCategory } from './types.js';
import { CONTRADICTION_CATEGORIES } from './constants.js';

/**
 * Detect contradictions between a new learning and existing learnings.
 *
 * Resolution logic:
 *   - If confidence differs by > 0.2: lower confidence loses (KEEP_EXISTING or REPLACE)
 *   - If confidence is similar (diff <= 0.2): mark as CONFLICT for human resolution
 */
export function detectContradictions(
  newLearning: LearningEntry,
  existingLearnings: LearningEntry[],
  categories: ContradictionCategory[] = CONTRADICTION_CATEGORIES,
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const newContent = newLearning.content.toLowerCase();

  for (const category of categories) {
    // Find which technology in this category the new learning mentions
    const newTech = category.mutuallyExclusive.find((tech) => newContent.includes(tech));
    if (!newTech) continue;

    // Check existing learnings for conflicting technologies in the same category
    for (const existing of existingLearnings) {
      const existingContent = existing.content.toLowerCase();
      const existingTech = category.mutuallyExclusive.find(
        (tech) => tech !== newTech && existingContent.includes(tech),
      );

      if (!existingTech) continue;

      // Determine resolution based on confidence difference
      const confidenceDiff = Math.abs(
        existing.confidence.score - newLearning.confidence.score,
      );

      let resolution: 'KEEP_EXISTING' | 'REPLACE' | 'CONFLICT';
      if (confidenceDiff > 0.2) {
        resolution =
          existing.confidence.score > newLearning.confidence.score
            ? 'KEEP_EXISTING'
            : 'REPLACE';
      } else {
        resolution = 'CONFLICT';
      }

      contradictions.push({
        existingLearning: existing,
        newLearning,
        category: category.name,
        resolution,
      });
    }
  }

  // Also check for direct negation patterns
  const negationContradictions = detectNegations(newLearning, existingLearnings);
  contradictions.push(...negationContradictions);

  return contradictions;
}

/**
 * Detect negation-based contradictions.
 * E.g., "use TypeScript strict" vs "don't use TypeScript strict"
 */
function detectNegations(
  newLearning: LearningEntry,
  existingLearnings: LearningEntry[],
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const negationPatterns = [
    /\b(?:don't|do not|never|avoid|stop using|remove)\b/i,
    /\b(?:always|must|should|use|prefer|switch to)\b/i,
  ];

  const newContent = newLearning.content.toLowerCase();
  const newHasNegation = negationPatterns[0]!.test(newContent);
  const newHasAffirmation = negationPatterns[1]!.test(newContent);

  for (const existing of existingLearnings) {
    if (existing.category !== newLearning.category) continue;

    const existingContent = existing.content.toLowerCase();
    const existingHasNegation = negationPatterns[0]!.test(existingContent);
    const existingHasAffirmation = negationPatterns[1]!.test(existingContent);

    // One affirms what the other negates about the same topic
    const isContradiction =
      (newHasNegation && existingHasAffirmation) ||
      (newHasAffirmation && existingHasNegation);

    if (!isContradiction) continue;

    // Check for topic overlap (shared significant words)
    const newWords = new Set(newContent.split(/\s+/).filter((w) => w.length > 3));
    const existingWords = existingContent.split(/\s+/).filter((w) => w.length > 3);
    const overlap = existingWords.filter((w) => newWords.has(w));

    if (overlap.length < 2) continue; // Not enough topic overlap

    const confidenceDiff = Math.abs(
      existing.confidence.score - newLearning.confidence.score,
    );

    contradictions.push({
      existingLearning: existing,
      newLearning,
      category: `negation:${newLearning.category}`,
      resolution: confidenceDiff > 0.2
        ? existing.confidence.score > newLearning.confidence.score
          ? 'KEEP_EXISTING'
          : 'REPLACE'
        : 'CONFLICT',
    });
  }

  return contradictions;
}
