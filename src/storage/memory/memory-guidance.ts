/**
 * In-memory Guidance Storage — FUNCTIONAL (Map-based).
 * For development and testing without Firestore.
 */

import type { IGuidanceStorage } from '../interfaces.js';
import type {
  NextStepSuggestion,
  RoadmapItem,
  ProjectProgress,
} from '../../engines/guidance/types.js';

export class InMemoryGuidanceStorage implements IGuidanceStorage {
  private suggestions = new Map<string, NextStepSuggestion[]>();
  private roadmapItems = new Map<string, RoadmapItem[]>();
  private progress = new Map<string, ProjectProgress>();

  private key(tenantId: string, projectId: string): string {
    return `${tenantId}:${projectId}`;
  }

  async saveSuggestions(
    tenantId: string,
    projectId: string,
    suggestions: NextStepSuggestion[],
  ): Promise<void> {
    this.suggestions.set(this.key(tenantId, projectId), [...suggestions]);
  }

  async getSuggestions(tenantId: string, projectId: string): Promise<NextStepSuggestion[]> {
    return [...(this.suggestions.get(this.key(tenantId, projectId)) ?? [])];
  }

  async updateSuggestion(
    tenantId: string,
    projectId: string,
    suggestionId: string,
    updates: Partial<NextStepSuggestion>,
  ): Promise<void> {
    const k = this.key(tenantId, projectId);
    const list = this.suggestions.get(k) ?? [];
    const suggestion = list.find((s) => s.id === suggestionId);
    if (suggestion) {
      Object.assign(suggestion, updates);
    }
  }

  async saveRoadmapItems(
    tenantId: string,
    projectId: string,
    items: RoadmapItem[],
  ): Promise<void> {
    this.roadmapItems.set(this.key(tenantId, projectId), [...items]);
  }

  async getRoadmapItems(tenantId: string, projectId: string): Promise<RoadmapItem[]> {
    return [...(this.roadmapItems.get(this.key(tenantId, projectId)) ?? [])];
  }

  async updateRoadmapItem(
    tenantId: string,
    projectId: string,
    itemId: string,
    updates: Partial<RoadmapItem>,
  ): Promise<void> {
    const k = this.key(tenantId, projectId);
    const list = this.roadmapItems.get(k) ?? [];
    const item = list.find((i) => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
    }
  }

  async saveProgress(
    tenantId: string,
    projectId: string,
    progress: ProjectProgress,
  ): Promise<void> {
    this.progress.set(this.key(tenantId, projectId), progress);
  }

  async getProgress(tenantId: string, projectId: string): Promise<ProjectProgress | null> {
    return this.progress.get(this.key(tenantId, projectId)) ?? null;
  }
}
