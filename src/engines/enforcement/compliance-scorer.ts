/**
 * ComplianceScorer — 5 weighted metrics + trend analysis.
 */

import type { Grade } from '../types.js';
import type { ComplianceMetrics, ComplianceHistoryEntry, ComplianceReport } from './types.js';
import { scoreToGrade } from './constants.js';

/**
 * Calculate weighted compliance metrics from 5 individual scores.
 * Each score is 0-100, weights sum to 1.0.
 */
export function calculateComplianceMetrics(
  templateScore: number,
  decisionGateScore: number,
  memoryScore: number,
  bitacoraScore: number,
  sessionScore: number,
  weights: Record<string, number>,
): ComplianceMetrics {
  const weightedTotal = Math.round(
    templateScore * (weights['template'] ?? 0.4) +
    decisionGateScore * (weights['decisionGate'] ?? 0.25) +
    memoryScore * (weights['memory'] ?? 0.15) +
    bitacoraScore * (weights['bitacora'] ?? 0.1) +
    sessionScore * (weights['session'] ?? 0.1),
  );

  return {
    templateScore,
    decisionGateScore,
    memoryScore,
    bitacoraScore,
    sessionScore,
    weightedTotal,
  };
}

/**
 * Determine trend from history: IMPROVING, STABLE, or DECLINING.
 * Uses last 5 entries vs previous 5.
 */
export function calculateTrend(
  history: ComplianceHistoryEntry[],
): 'IMPROVING' | 'STABLE' | 'DECLINING' {
  if (history.length < 3) return 'STABLE';

  const recent = history.slice(-3);
  const older = history.slice(-6, -3);

  if (older.length === 0) return 'STABLE';

  const recentAvg = recent.reduce((s, e) => s + e.score, 0) / recent.length;
  const olderAvg = older.reduce((s, e) => s + e.score, 0) / older.length;

  const diff = recentAvg - olderAvg;
  if (diff > 5) return 'IMPROVING';
  if (diff < -5) return 'DECLINING';
  return 'STABLE';
}

/**
 * Build a compliance report from history and current state.
 */
export function buildComplianceReport(
  history: ComplianceHistoryEntry[],
  currentScore: number,
  currentGrade: Grade,
): ComplianceReport {
  const violationsByType: Record<string, number> = {};

  const averageScore = history.length > 0
    ? Math.round(history.reduce((s, e) => s + e.score, 0) / history.length)
    : currentScore;

  return {
    currentScore,
    grade: currentGrade,
    trend: calculateTrend(history),
    cyclesTracked: history.length,
    averageScore,
    violationsByType,
  };
}

export { scoreToGrade };
