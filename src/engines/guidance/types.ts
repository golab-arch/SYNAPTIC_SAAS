/**
 * Guidance Engine types — Motor 4.
 * "Waze del desarrollo": analyzes roadmap, context, and bitacora
 * to generate prioritized next-step suggestions.
 */

import type { IEngine } from '../types.js';
import type { IIntelligenceEngine } from '../intelligence/types.js';

// ─── Configuration ──────────────────────────────────────────────

export interface GuidanceConfig {
  readonly storage: IGuidanceStorage;
  readonly intelligenceEngine: IIntelligenceEngine;
  readonly maxSuggestions: number;
  readonly priorityWeights: {
    readonly urgency: number;
    readonly dependency: number;
    readonly complexity: number;
  };
}

// ─── Suggestions ────────────────────────────────────────────────

export interface NextStepSuggestion {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: 'feature' | 'fix' | 'refactor' | 'test' | 'docs' | 'config';
  readonly priority: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly suggestedPrompt: string;
  readonly effort: 'small' | 'medium' | 'large';
  status: 'pending' | 'completed' | 'in_progress';
  completedInCycle?: number;
  readonly dependsOn?: readonly string[];
}

// ─── Roadmap ────────────────────────────────────────────────────

export interface RoadmapItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly phase: string;
  readonly priority: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly effort: 'small' | 'medium' | 'large';
  status: 'pending' | 'completed' | 'in_progress';
  completedInCycle?: number;
  readonly dependsOn?: readonly string[];
}

export interface RoadmapGuidance {
  readonly orientation: string;
  readonly progress: ProjectProgress;
  readonly nextSteps: NextStepSuggestion[];
  readonly blockers: string[];
  readonly generatedAt: string;
}

export interface ProjectProgress {
  readonly totalItems: number;
  readonly completedItems: number;
  readonly percentage: number;
  readonly byPhase: readonly PhaseProgress[];
}

export interface PhaseProgress {
  readonly phase: string;
  readonly total: number;
  readonly completed: number;
  readonly percentage: number;
}

// ─── Storage Interface ──────────────────────────────────────────

export interface IGuidanceStorage {
  saveSuggestions(
    tenantId: string,
    projectId: string,
    suggestions: NextStepSuggestion[],
  ): Promise<void>;
  getSuggestions(tenantId: string, projectId: string): Promise<NextStepSuggestion[]>;
  updateSuggestion(
    tenantId: string,
    projectId: string,
    suggestionId: string,
    updates: Partial<NextStepSuggestion>,
  ): Promise<void>;
  saveRoadmapItems(tenantId: string, projectId: string, items: RoadmapItem[]): Promise<void>;
  getRoadmapItems(tenantId: string, projectId: string): Promise<RoadmapItem[]>;
  updateRoadmapItem(
    tenantId: string,
    projectId: string,
    itemId: string,
    updates: Partial<RoadmapItem>,
  ): Promise<void>;
  saveProgress(tenantId: string, projectId: string, progress: ProjectProgress): Promise<void>;
  getProgress(tenantId: string, projectId: string): Promise<ProjectProgress | null>;
}

// ─── Engine Interface ───────────────────────────────────────────

export interface IGuidanceEngine extends IEngine {
  initialize(config: GuidanceConfig): Promise<void>;

  /** Generate full guidance report */
  generateGuidance(): Promise<RoadmapGuidance>;

  /** Get top suggestions */
  getSuggestions(limit?: number): Promise<NextStepSuggestion[]>;

  /** Mark a suggestion as completed */
  markCompleted(suggestionId: string, cycle: number): Promise<void>;

  /** Get progress overview */
  getProgress(): Promise<ProjectProgress>;

  /** Get all roadmap items */
  getRoadmapItems(): Promise<RoadmapItem[]>;

  /** Update a roadmap item */
  updateRoadmapItem(itemId: string, updates: Partial<RoadmapItem>): Promise<void>;
}
