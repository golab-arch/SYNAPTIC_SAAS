/**
 * Suggestion Generator — generates prioritized next-step suggestions.
 * FUNCTIONAL implementation — scoring + prompt generation.
 */

import type { RoadmapItem, NextStepSuggestion, GuidanceConfig } from './types.js';

interface ScoredItem {
  item: RoadmapItem;
  score: number;
}

/**
 * Generate suggestions from pending roadmap items, ordered by priority.
 */
export function generateSuggestions(
  items: RoadmapItem[],
  config: GuidanceConfig,
): NextStepSuggestion[] {
  // Filter to non-completed items
  const pending = items.filter((i) => i.status !== 'completed');
  if (pending.length === 0) return [];

  // Score each item
  const scored: ScoredItem[] = pending.map((item) => ({
    item,
    score: calculateItemScore(item, items, config),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Convert top items to suggestions
  return scored.slice(0, config.maxSuggestions).map((s) => itemToSuggestion(s.item));
}

function calculateItemScore(
  item: RoadmapItem,
  allItems: RoadmapItem[],
  config: GuidanceConfig,
): number {
  const w = config.priorityWeights;
  let score = 0;

  // Urgency: based on priority
  const urgencyScore = item.priority === 'HIGH' ? 100 : item.priority === 'MEDIUM' ? 50 : 25;
  score += urgencyScore * w.urgency;

  // In-progress items get a boost
  if (item.status === 'in_progress') score += 75;

  // Dependency: check if dependencies are resolved
  if (item.dependsOn && item.dependsOn.length > 0) {
    const resolved = item.dependsOn.every((depId) => {
      const dep = allItems.find((i) => i.id === depId);
      return dep?.status === 'completed';
    });
    score += (resolved ? 100 : 0) * w.dependency;
  } else {
    // No dependencies = ready to go
    score += 80 * w.dependency;
  }

  // Complexity: inverse (simpler items score higher)
  const complexityScore = item.effort === 'small' ? 100 : item.effort === 'medium' ? 60 : 30;
  score += complexityScore * w.complexity;

  return Math.round(score);
}

function itemToSuggestion(item: RoadmapItem): NextStepSuggestion {
  const category = detectCategory(item.title);
  const prompt = generatePrompt(item, category);

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    category,
    priority: item.priority,
    suggestedPrompt: prompt,
    effort: item.effort,
    status: item.status,
    dependsOn: item.dependsOn,
  };
}

function detectCategory(text: string): 'feature' | 'fix' | 'refactor' | 'test' | 'docs' | 'config' {
  const lower = text.toLowerCase();
  if (/\b(?:fix|bug|error|broken|issue|patch)\b/.test(lower)) return 'fix';
  if (/\b(?:refactor|cleanup|reorganize|simplify|extract)\b/.test(lower)) return 'refactor';
  if (/\b(?:test|spec|coverage|assert|expect)\b/.test(lower)) return 'test';
  if (/\b(?:doc|readme|comment|guide|manual)\b/.test(lower)) return 'docs';
  if (/\b(?:config|setup|install|env|deploy|ci|cd)\b/.test(lower)) return 'config';
  return 'feature';
}

function generatePrompt(item: RoadmapItem, category: string): string {
  const action = category === 'fix' ? 'Fix' : category === 'refactor' ? 'Refactor' : category === 'test' ? 'Write tests for' : 'Implement';
  return `${action}: ${item.title}\n\nContext: This task is in ${item.phase} with ${item.priority} priority (effort: ${item.effort}).`;
}

/**
 * Generate orientation text describing current project state.
 */
export function generateOrientation(
  currentCycle: number,
  currentPhase: string,
  totalTasks: number,
  completedTasks: number,
  blockedTasks: number,
  inProgressTasks: number,
): string {
  const pendingTasks = totalTasks - completedTasks - blockedTasks - inProgressTasks;
  return `Estas en ${currentPhase} (ciclo ${currentCycle}). ${blockedTasks} bloqueadas, ${inProgressTasks} en progreso, ${pendingTasks} pendientes de ${totalTasks} total. Progreso: ${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%.`;
}
