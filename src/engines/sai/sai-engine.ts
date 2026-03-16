/**
 * SAIEngine — Motor 2 main class.
 * Orchestrates the 8-check audit pipeline with scoring and finding persistence.
 */

import type {
  ISAIEngine,
  SAIConfig,
  SAIAuditResult,
  FileContent,
  Finding,
  ResolvedFinding,
  SAICycleEntry,
  TrendAnalysis,
  SAIAuditSummary,
} from './types.js';
import { saiScoreToGrade, SAI_PASS_THRESHOLD } from './constants.js';

export class SAIEngine implements ISAIEngine {
  private config!: SAIConfig;

  async initialize(config: SAIConfig): Promise<void> {
    this.config = config;
  }

  async dispose(): Promise<void> {
    // No cleanup needed
  }

  async audit(changedFiles: FileContent[]): Promise<SAIAuditResult> {
    const startTime = Date.now();
    const allFindings: Finding[] = [];
    let filesAudited = 0;
    let filesSkipped = 0;

    for (const file of changedFiles) {
      // Filter by extension whitelist
      const ext = file.path.substring(file.path.lastIndexOf('.'));
      if (!this.config.extensionWhitelist.includes(ext)) {
        filesSkipped++;
        continue;
      }

      // Filter by exclude patterns
      if (this.config.excludePatterns.some((p) => file.path.includes(p))) {
        filesSkipped++;
        continue;
      }

      // Filter by file size
      if (file.content.length > this.config.maxFileSize) {
        filesSkipped++;
        continue;
      }

      filesAudited++;

      // Run each enabled check
      for (const checkItem of this.config.checklist) {
        if (!checkItem.enabled) continue;

        try {
          const findings = checkItem.check(file.content, file.path);
          allFindings.push(...findings);
        } catch {
          // Individual check failure should not crash the audit
        }
      }
    }

    // Calculate score: start at 100, subtract penalties
    let score = 100;
    for (const finding of allFindings) {
      const penalty = this.config.severityPenalties[finding.severity] ?? 0;
      score -= Math.abs(penalty);
    }
    score = Math.max(0, Math.min(100, score));

    const grade = saiScoreToGrade(score);
    const passed = score >= (this.config.passThreshold ?? SAI_PASS_THRESHOLD);
    const duration = Date.now() - startTime;

    return { score, grade, passed, findings: allFindings, filesAudited, filesSkipped, duration };
  }

  async getActiveFindings(): Promise<Finding[]> {
    return this.config.storage.getActiveFindings('default', 'default');
  }

  async getResolvedFindings(): Promise<Finding[]> {
    return this.config.storage.getResolvedFindings('default', 'default');
  }

  async detectResolutions(currentFindings: Finding[]): Promise<ResolvedFinding[]> {
    const active = await this.getActiveFindings();
    const resolved: ResolvedFinding[] = [];

    for (const existing of active) {
      const stillPresent = currentFindings.some(
        (f) => f.file === existing.file && f.type === existing.type && f.description === existing.description,
      );
      if (!stillPresent) {
        resolved.push({ findingId: existing.id, resolvedInCycle: 0 });
      }
    }

    return resolved;
  }

  async getAuditHistory(limit?: number): Promise<SAICycleEntry[]> {
    return this.config.storage.getAuditHistory('default', 'default', limit);
  }

  async getScoreTrend(): Promise<TrendAnalysis> {
    const history = await this.getAuditHistory(10);
    const scores = history.map((h) => h.score);

    if (scores.length < 3) {
      return { direction: 'STABLE', recentScores: scores, averageRecent: avg(scores), averageHistorical: avg(scores) };
    }

    const recent = scores.slice(-3);
    const older = scores.slice(0, -3);
    const recentAvg = avg(recent);
    const olderAvg = avg(older);

    let direction: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
    if (recentAvg - olderAvg > 5) direction = 'IMPROVING';
    else if (olderAvg - recentAvg > 5) direction = 'DECLINING';

    return { direction, recentScores: scores, averageRecent: recentAvg, averageHistorical: olderAvg };
  }

  async getSummary(): Promise<SAIAuditSummary> {
    const history = await this.getAuditHistory();
    const active = await this.getActiveFindings();
    const resolved = await this.getResolvedFindings();

    const bySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const f of active) {
      bySeverity[f.severity]++;
    }

    return {
      totalAudits: history.length,
      averageScore: history.length > 0 ? avg(history.map((h) => h.score)) : 100,
      activeFindings: active.length,
      resolvedFindings: resolved.length,
      bySeverity,
    };
  }
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
