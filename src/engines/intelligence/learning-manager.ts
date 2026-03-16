/**
 * Learning Manager — CRUD for learnings with confidence, dedup, and contradiction detection.
 * FUNCTIONAL implementation.
 */

import type { LearningEntry, ConfidenceSource, Contradiction, IIntelligenceStorage, ContradictionCategory } from './types.js';
import { reinforce, applyDecayToLearning, filterForInjection, findSimilarLearning } from './confidence-system.js';
import { detectContradictions } from './contradiction-detector.js';

export class LearningManager {
  private readonly contradictions: Contradiction[] = [];

  constructor(
    private readonly storage: IIntelligenceStorage,
    private readonly tenantId: string,
    private readonly projectId: string,
    private readonly contradictionCategories: ContradictionCategory[],
  ) {}

  /**
   * Add a learning with dedup + contradiction check.
   * If similar exists → reinforce instead of creating new.
   * If contradiction → store contradiction and still add (user resolves later).
   */
  async addLearning(learning: LearningEntry, currentCycle: number): Promise<{ added: boolean; reinforced: boolean; contradictions: Contradiction[] }> {
    const existing = await this.storage.getLearnings(this.tenantId, this.projectId);

    // Check for similar learning (dedup)
    const similar = findSimilarLearning(learning.content, learning.category, existing);
    if (similar) {
      reinforce(similar, learning.confidence.source, currentCycle);
      await this.storage.updateLearning(this.tenantId, this.projectId, similar.id, similar);
      return { added: false, reinforced: true, contradictions: [] };
    }

    // Check for contradictions
    const found = detectContradictions(learning, existing, this.contradictionCategories);
    if (found.length > 0) {
      this.contradictions.push(...found);
    }

    // Add the learning regardless (user resolves contradictions)
    await this.storage.saveLearning(this.tenantId, this.projectId, learning);
    return { added: true, reinforced: false, contradictions: found };
  }

  async getLearnings(options?: { minConfidence?: number; limit?: number }): Promise<LearningEntry[]> {
    const all = await this.storage.getLearnings(this.tenantId, this.projectId);

    if (options?.minConfidence != null || options?.limit != null) {
      return filterForInjection(
        all,
        options.minConfidence ?? 0,
        options.limit ?? all.length,
      );
    }

    return all;
  }

  async reinforceLearning(learningId: string, source: ConfidenceSource, currentCycle: number): Promise<void> {
    const all = await this.storage.getLearnings(this.tenantId, this.projectId);
    const learning = all.find((l) => l.id === learningId);
    if (!learning) return;

    reinforce(learning, source, currentCycle);
    await this.storage.updateLearning(this.tenantId, this.projectId, learningId, learning);
  }

  async applyDecay(currentCycle: number): Promise<number> {
    const all = await this.storage.getLearnings(this.tenantId, this.projectId);
    let archivedCount = 0;

    for (const learning of all) {
      const shouldArchive = applyDecayToLearning(learning, currentCycle);
      if (shouldArchive) {
        archivedCount++;
      }
      await this.storage.updateLearning(this.tenantId, this.projectId, learning.id, learning);
    }

    return archivedCount;
  }

  async detectContradictions(newLearning: LearningEntry): Promise<Contradiction[]> {
    const existing = await this.storage.getLearnings(this.tenantId, this.projectId);
    return detectContradictions(newLearning, existing, this.contradictionCategories);
  }

  getContradictions(): Contradiction[] {
    return [...this.contradictions];
  }
}
