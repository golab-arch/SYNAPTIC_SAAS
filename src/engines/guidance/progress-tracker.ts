/**
 * Progress Tracker — calculates progress from roadmap items.
 * FUNCTIONAL implementation.
 */

import type { RoadmapItem, ProjectProgress, PhaseProgress } from './types.js';

/**
 * Calculate progress across all roadmap items.
 */
export function calculateProgress(items: RoadmapItem[]): ProjectProgress {
  const completedItems = items.filter((i) => i.status === 'completed').length;
  const percentage = items.length > 0 ? Math.round((completedItems / items.length) * 100) : 0;

  // Group by phase
  const phases = new Map<string, { total: number; completed: number }>();
  for (const item of items) {
    const phase = phases.get(item.phase) ?? { total: 0, completed: 0 };
    phase.total++;
    if (item.status === 'completed') phase.completed++;
    phases.set(item.phase, phase);
  }

  const byPhase: PhaseProgress[] = [];
  for (const [phase, counts] of phases) {
    byPhase.push({
      phase,
      total: counts.total,
      completed: counts.completed,
      percentage: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
    });
  }

  return { totalItems: items.length, completedItems, percentage, byPhase };
}
