/**
 * GuidanceEngine — Motor 4 main class.
 * "Waze del desarrollo" — scans context, analyzes bitacora, generates suggestions.
 * FUNCTIONAL implementation.
 */

import type {
  IGuidanceEngine,
  GuidanceConfig,
  RoadmapGuidance,
  NextStepSuggestion,
  ProjectProgress,
  RoadmapItem,
} from './types.js';
import { parseRoadmap } from './roadmap-analyzer.js';
import { calculateProgress } from './progress-tracker.js';
import { generateSuggestions, generateOrientation } from './suggestion-generator.js';

export class GuidanceEngine implements IGuidanceEngine {
  private config!: GuidanceConfig;

  async initialize(config: GuidanceConfig): Promise<void> {
    this.config = config;
  }

  async dispose(): Promise<void> {
    // No cleanup needed
  }

  async generateGuidance(): Promise<RoadmapGuidance> {
    // 1. Get roadmap items from storage (or parse from context documents)
    let items = await this.config.storage.getRoadmapItems('default', 'default');

    // If no saved items, try parsing from intelligence engine context
    if (items.length === 0) {
      try {
        const docs = await this.config.intelligenceEngine.getContextDocuments();
        for (const doc of docs) {
          const parsed = parseRoadmap(doc.content, doc.name);
          items.push(...parsed);
        }
        if (items.length > 0) {
          await this.config.storage.saveRoadmapItems('default', 'default', items);
        }
      } catch {
        // Context documents not available — use empty list
      }
    }

    // 2. Calculate progress
    const progress = calculateProgress(items);

    // 3. Generate suggestions
    const nextSteps = generateSuggestions(items, this.config);

    // 4. Detect blockers
    const blockers = items
      .filter((i) => i.status === 'pending' && i.dependsOn && i.dependsOn.length > 0)
      .filter((i) => i.dependsOn!.some((depId) => {
        const dep = items.find((d) => d.id === depId);
        return dep && dep.status !== 'completed';
      }))
      .map((i) => `${i.title} (blocked by dependencies)`);

    // 5. Generate orientation
    const session = await this.config.intelligenceEngine.getSession();
    const inProgress = items.filter((i) => i.status === 'in_progress').length;
    const blocked = blockers.length;

    const orientation = generateOrientation(
      session.currentCycle,
      progress.byPhase[0]?.phase ?? 'unknown',
      progress.totalItems,
      progress.completedItems,
      blocked,
      inProgress,
    );

    return {
      orientation,
      progress,
      nextSteps,
      blockers,
      generatedAt: new Date().toISOString(),
    };
  }

  async getSuggestions(limit?: number): Promise<NextStepSuggestion[]> {
    const guidance = await this.generateGuidance();
    return guidance.nextSteps.slice(0, limit ?? this.config.maxSuggestions);
  }

  async markCompleted(suggestionId: string, cycle: number): Promise<void> {
    await this.config.storage.updateSuggestion('default', 'default', suggestionId, {
      status: 'completed',
      completedInCycle: cycle,
    });
    await this.config.storage.updateRoadmapItem('default', 'default', suggestionId, {
      status: 'completed',
      completedInCycle: cycle,
    });
  }

  async getProgress(): Promise<ProjectProgress> {
    const items = await this.config.storage.getRoadmapItems('default', 'default');
    return calculateProgress(items);
  }

  async getRoadmapItems(): Promise<RoadmapItem[]> {
    return this.config.storage.getRoadmapItems('default', 'default');
  }

  async updateRoadmapItem(itemId: string, updates: Partial<RoadmapItem>): Promise<void> {
    await this.config.storage.updateRoadmapItem('default', 'default', itemId, updates);
  }
}
