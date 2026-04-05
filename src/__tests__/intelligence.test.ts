/**
 * Intelligence Engine — confidence system + contradiction detector tests.
 */

import { describe, it, expect } from 'vitest';
import {
  getInitialScore,
  reinforce,
  applyDecayToLearning,
  filterForInjection,
  findSimilarLearning,
} from '../engines/intelligence/confidence-system.js';
import { detectContradictions } from '../engines/intelligence/contradiction-detector.js';
import { CONTRADICTION_CATEGORIES } from '../engines/intelligence/constants.js';
import type { LearningEntry } from '../engines/intelligence/types.js';

function makeLearning(opts: { content: string; category: string; confidence?: Partial<LearningEntry['confidence']> }): LearningEntry {
  return {
    id: `learning-${Math.random().toString(36).slice(2)}`,
    content: opts.content,
    category: opts.category,
    confidence: {
      score: opts.confidence?.score ?? 0.5,
      source: opts.confidence?.source ?? 'INFERRED',
      evidenceCount: opts.confidence?.evidenceCount ?? 1,
      lastReinforced: new Date().toISOString(),
      lastReinforcedCycle: opts.confidence?.lastReinforcedCycle ?? 1,
    },
    createdAt: new Date().toISOString(),
    createdInCycle: 1,
  };
}

describe('ConfidenceSystem', () => {
  it('should set EXPLICIT initial confidence to 0.6 (DG-126 aligned)', () => {
    expect(getInitialScore('EXPLICIT')).toBe(0.6);
  });

  it('should set INFERRED initial confidence to 0.4 (DG-126 aligned)', () => {
    expect(getInitialScore('INFERRED')).toBe(0.4);
  });

  it('should set REPEATED initial confidence to 0.8 (DG-126 aligned)', () => {
    expect(getInitialScore('REPEATED')).toBe(0.8);
  });

  it('should reinforce with correct increment per source', () => {
    const learning = makeLearning({ content: 'test', category: 'testing', confidence: { score: 0.5, source: 'INFERRED', evidenceCount: 1, lastReinforced: '', lastReinforcedCycle: 1 } });

    reinforce(learning, 'INFERRED', 2);
    expect(learning.confidence.score).toBeCloseTo(0.65); // 0.5 + 0.15
    expect(learning.confidence.evidenceCount).toBe(2);
  });

  it('should auto-promote INFERRED to REPEATED at 3+ evidence', () => {
    const learning = makeLearning({
      content: 'test', category: 'testing',
      confidence: { score: 0.6, source: 'INFERRED', evidenceCount: 2, lastReinforced: '', lastReinforcedCycle: 1 },
    });

    // After reinforcement: evidenceCount=3, score=0.75 → auto-promote
    reinforce(learning, 'INFERRED', 3);
    expect(learning.confidence.source).toBe('REPEATED');
    expect(learning.confidence.evidenceCount).toBe(3);
  });

  it('should cap confidence at 1.0', () => {
    const learning = makeLearning({
      content: 'test', category: 'testing',
      confidence: { score: 0.95, source: 'EXPLICIT', evidenceCount: 5, lastReinforced: '', lastReinforcedCycle: 1 },
    });

    reinforce(learning, 'EXPLICIT', 2);
    expect(learning.confidence.score).toBe(1.0);
  });

  it('should apply decay after grace period (DG-126: rate 0.02)', () => {
    const learning = makeLearning({
      content: 'test', category: 'testing',
      confidence: { score: 0.8, source: 'REPEATED', evidenceCount: 3, lastReinforced: '', lastReinforcedCycle: 1 },
    });

    // 26 cycles later, grace period = 20, so 5 * 0.02 = 0.1 decay
    const shouldArchive = applyDecayToLearning(learning, 26);
    expect(learning.confidence.score).toBeCloseTo(0.7); // 0.8 - 0.1
    expect(shouldArchive).toBe(false); // 0.7 > 0.2 threshold
  });

  it('should archive learnings below threshold (DG-126: rate 0.02)', () => {
    const learning = makeLearning({
      content: 'test', category: 'testing',
      confidence: { score: 0.3, source: 'INFERRED', evidenceCount: 1, lastReinforced: '', lastReinforcedCycle: 1 },
    });

    // Cycle 36: 15 decay cycles * 0.02 = 0.30 decay → score = max(0, 0.3 - 0.30) = 0
    const shouldArchive = applyDecayToLearning(learning, 36);
    expect(shouldArchive).toBe(true);
    expect(learning.confidence.score).toBe(0);
  });

  it('should NOT decay within grace period', () => {
    const learning = makeLearning({
      content: 'test', category: 'testing',
      confidence: { score: 0.5, source: 'INFERRED', evidenceCount: 1, lastReinforced: '', lastReinforcedCycle: 10 },
    });

    const shouldArchive = applyDecayToLearning(learning, 25); // 15 cycles, within grace
    expect(shouldArchive).toBe(false);
    expect(learning.confidence.score).toBe(0.5); // Unchanged
  });

  it('should filter by confidence threshold', () => {
    const learnings = [
      makeLearning({ content: 'high', category: 'a', confidence: { score: 0.9, source: 'EXPLICIT', evidenceCount: 1, lastReinforced: '', lastReinforcedCycle: 1 } }),
      makeLearning({ content: 'mid', category: 'b', confidence: { score: 0.5, source: 'REPEATED', evidenceCount: 1, lastReinforced: '', lastReinforcedCycle: 1 } }),
      makeLearning({ content: 'low', category: 'c', confidence: { score: 0.2, source: 'INFERRED', evidenceCount: 1, lastReinforced: '', lastReinforcedCycle: 1 } }),
    ];

    const filtered = filterForInjection(learnings, 0.5, 10);
    expect(filtered).toHaveLength(2);
    expect(filtered[0]!.content).toBe('high');
    expect(filtered[1]!.content).toBe('mid');
  });

  it('should find similar learning by word overlap', () => {
    const existing = [
      makeLearning({ content: 'Use TypeScript strict mode for all files', category: 'config' }),
    ];

    const similar = findSimilarLearning('Always use TypeScript strict mode', 'config', existing);
    expect(similar).not.toBeNull();
  });

  it('should NOT match dissimilar learnings', () => {
    const existing = [
      makeLearning({ content: 'Use PostgreSQL for the database', category: 'database' }),
    ];

    const similar = findSimilarLearning('Prefer dark mode in the UI', 'ui', existing);
    expect(similar).toBeNull();
  });
});

describe('ContradictionDetector', () => {
  it('should detect Level 1: mutually exclusive tech (jest vs vitest)', () => {
    const existing = makeLearning({ content: 'Use jest for testing in this project', category: 'testing', confidence: { score: 0.7, source: 'REPEATED', evidenceCount: 2, lastReinforced: '', lastReinforcedCycle: 1 } });
    const newL = makeLearning({ content: 'Use vitest for testing framework', category: 'testing', confidence: { score: 0.5, source: 'INFERRED', evidenceCount: 1, lastReinforced: '', lastReinforcedCycle: 1 } });

    const contradictions = detectContradictions(newL, [existing], CONTRADICTION_CATEGORIES);
    expect(contradictions.length).toBeGreaterThanOrEqual(1);
    expect(contradictions[0]!.category).toBe('testing');
  });

  it('should detect mutually exclusive ORMs (prisma vs drizzle)', () => {
    const existing = makeLearning({ content: 'Use prisma as the ORM', category: 'orm', confidence: { score: 0.8, source: 'EXPLICIT', evidenceCount: 1, lastReinforced: '', lastReinforcedCycle: 1 } });
    const newL = makeLearning({ content: 'Migrate to drizzle ORM', category: 'orm', confidence: { score: 0.5, source: 'INFERRED', evidenceCount: 1, lastReinforced: '', lastReinforcedCycle: 1 } });

    const contradictions = detectContradictions(newL, [existing], CONTRADICTION_CATEGORIES);
    expect(contradictions.length).toBeGreaterThanOrEqual(1);
    expect(contradictions[0]!.category).toBe('orm');
  });

  it('should suggest KEEP_EXISTING when existing has much higher confidence', () => {
    const existing = makeLearning({ content: 'Use jest for testing', category: 'testing', confidence: { score: 0.9, source: 'EXPLICIT', evidenceCount: 5, lastReinforced: '', lastReinforcedCycle: 1 } });
    const newL = makeLearning({ content: 'Use vitest for testing', category: 'testing', confidence: { score: 0.3, source: 'INFERRED', evidenceCount: 1, lastReinforced: '', lastReinforcedCycle: 1 } });

    const contradictions = detectContradictions(newL, [existing], CONTRADICTION_CATEGORIES);
    expect(contradictions.length).toBeGreaterThanOrEqual(1);
    expect(contradictions[0]!.resolution).toBe('KEEP_EXISTING');
  });

  it('should NOT detect contradiction for unrelated learnings', () => {
    const existing = makeLearning({ content: 'Use PostgreSQL database', category: 'database' });
    const newL = makeLearning({ content: 'Use TailwindCSS for styling', category: 'styling' });

    const contradictions = detectContradictions(newL, [existing], CONTRADICTION_CATEGORIES);
    expect(contradictions).toHaveLength(0);
  });
});
