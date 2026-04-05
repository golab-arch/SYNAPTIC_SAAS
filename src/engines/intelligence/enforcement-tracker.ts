/**
 * EnforcementTracker — records enforcement metrics per cycle, analyzes every 4 cycles.
 * Ported from VSC_EXTENSION learningService.ts (DG-126 Phase 4).
 */

import type { LearningEntry, ConfidenceSource } from './types.js';
import { INITIAL_CONFIDENCE } from './constants.js';

interface HistoryEntry {
  cycle: number;
  score: number;
  grade: string;
  model: string;
  provider: string;
}

const MAX_HISTORY = 20;
const ANALYSIS_INTERVAL = 4;

export class EnforcementTracker {
  private history: HistoryEntry[] = [];

  record(cycle: number, score: number, grade: string, model: string, provider: string): void {
    this.history.push({ cycle, score, grade, model, provider });
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }
  }

  /** Analyze patterns every 4 cycles. Returns 0-2 learnings. */
  analyze(currentCycle: number): LearningEntry[] {
    if (currentCycle % ANALYSIS_INTERVAL !== 0) return [];
    if (this.history.length < ANALYSIS_INTERVAL) return [];

    const recent = this.history.slice(-ANALYSIS_INTERVAL);
    const learnings: LearningEntry[] = [];
    const now = new Date().toISOString();

    // Learning 1: Compliance trend
    const avgScore = Math.round(recent.reduce((s, e) => s + e.score, 0) / recent.length);
    const avgGrade = avgScore >= 95 ? 'A' : avgScore >= 85 ? 'B' : avgScore >= 70 ? 'C' : avgScore >= 50 ? 'D' : 'F';
    const cycleRange = `${recent[0]!.cycle}-${recent[recent.length - 1]!.cycle}`;

    learnings.push({
      id: `enforcement-trend-${currentCycle}-${Date.now()}`,
      content: `Compliance trend: Grade ${avgGrade} (${avgScore}%) over cycles ${cycleRange}`,
      category: 'enforcement',
      confidence: {
        score: INITIAL_CONFIDENCE.INFERRED,
        source: 'INFERRED' as ConfidenceSource,
        evidenceCount: recent.length,
        lastReinforced: now,
        lastReinforcedCycle: currentCycle,
      },
      createdAt: now,
      createdInCycle: currentCycle,
    });

    // Learning 2: Model performance (if one model used >= 50%)
    const modelCounts: Record<string, { count: number; totalScore: number; provider: string }> = {};
    for (const e of recent) {
      if (!modelCounts[e.model]) modelCounts[e.model] = { count: 0, totalScore: 0, provider: e.provider };
      modelCounts[e.model]!.count++;
      modelCounts[e.model]!.totalScore += e.score;
    }

    for (const [model, data] of Object.entries(modelCounts)) {
      if (data.count >= Math.ceil(recent.length * 0.5)) {
        const modelAvg = Math.round(data.totalScore / data.count);
        const quality = modelAvg >= 80 ? 'performs well' : 'may not be ideal';
        learnings.push({
          id: `enforcement-model-${currentCycle}-${Date.now()}`,
          content: `Model ${model} ${quality} for this project (avg ${modelAvg}%, provider: ${data.provider})`,
          category: 'model-performance',
          confidence: {
            score: INITIAL_CONFIDENCE.INFERRED,
            source: 'INFERRED' as ConfidenceSource,
            evidenceCount: data.count,
            lastReinforced: now,
            lastReinforcedCycle: currentCycle,
          },
          createdAt: now,
          createdInCycle: currentCycle,
        });
        break;
      }
    }

    return learnings;
  }
}
