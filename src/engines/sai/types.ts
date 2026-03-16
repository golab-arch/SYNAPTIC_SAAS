/**
 * SAI Engine types — Motor 2.
 * Sistema de Auditoria Incremental: continuous quality audit
 * with finding persistence and auto-resolution.
 */

import type { Severity, Grade, IEngine } from '../types.js';

// ─── Configuration ──────────────────────────────────────────────

export interface SAIConfig {
  readonly checklist: SAIChecklistItem[];
  readonly severityPenalties: Record<Severity, number>;
  readonly passThreshold: number;
  readonly maxFileSize: number;
  readonly timeout: number;
  readonly extensionWhitelist: string[];
  readonly excludePatterns: string[];
  readonly storage: ISAIStorage;
}

export interface SAIChecklistItem {
  readonly id: string;
  readonly name: string;
  readonly severity: Severity;
  readonly check: (fileContent: string, filePath: string) => Finding[];
  readonly enabled: boolean;
}

// ─── Input / Output ─────────────────────────────────────────────

export interface FileContent {
  readonly path: string;
  readonly content: string;
  readonly previousContent?: string;
}

export interface SAIAuditResult {
  readonly score: number;
  readonly grade: Grade;
  readonly passed: boolean;
  readonly findings: Finding[];
  readonly filesAudited: number;
  readonly filesSkipped: number;
  readonly duration: number;
}

export interface Finding {
  readonly id: string;
  readonly type:
    | 'dead_code'
    | 'duplication'
    | 'security'
    | 'maintainability'
    | 'consistency'
    | 'error_handling';
  readonly severity: Severity;
  readonly file: string;
  readonly line?: number;
  readonly description: string;
  readonly suggestion?: string;
  status: 'OPEN' | 'RESOLVED';
  readonly detectedInCycle: number;
  resolvedInCycle?: number;
}

export interface ResolvedFinding {
  readonly findingId: string;
  readonly resolvedInCycle: number;
}

// ─── History & Metrics ──────────────────────────────────────────

export interface SAICycleEntry {
  readonly cycle: number;
  readonly score: number;
  readonly grade: Grade;
  readonly findingsCount: number;
  readonly resolvedCount: number;
  readonly timestamp: string;
}

export interface SAIAuditSummary {
  readonly totalAudits: number;
  readonly averageScore: number;
  readonly activeFindings: number;
  readonly resolvedFindings: number;
  readonly bySeverity: Record<Severity, number>;
}

export interface TrendAnalysis {
  readonly direction: 'IMPROVING' | 'STABLE' | 'DECLINING';
  readonly recentScores: number[];
  readonly averageRecent: number;
  readonly averageHistorical: number;
}

// ─── Storage Interface ──────────────────────────────────────────

export interface ISAIStorage {
  saveAuditResult(
    tenantId: string,
    projectId: string,
    result: SAIAuditResult,
    cycle: number,
  ): Promise<void>;
  getAuditHistory(
    tenantId: string,
    projectId: string,
    limit?: number,
  ): Promise<SAICycleEntry[]>;
  saveFindings(tenantId: string, projectId: string, findings: Finding[]): Promise<void>;
  getActiveFindings(tenantId: string, projectId: string): Promise<Finding[]>;
  getResolvedFindings(tenantId: string, projectId: string): Promise<Finding[]>;
  updateFinding(
    tenantId: string,
    projectId: string,
    findingId: string,
    updates: Partial<Finding>,
  ): Promise<void>;
}

// ─── Engine Interface ───────────────────────────────────────────

export interface ISAIEngine extends IEngine {
  initialize(config: SAIConfig): Promise<void>;

  /** Run audit on changed files */
  audit(changedFiles: FileContent[]): Promise<SAIAuditResult>;

  /** Get all active (unresolved) findings */
  getActiveFindings(): Promise<Finding[]>;

  /** Get all resolved findings */
  getResolvedFindings(): Promise<Finding[]>;

  /** Detect findings that have been resolved in current code */
  detectResolutions(currentFindings: Finding[]): Promise<ResolvedFinding[]>;

  /** Get audit history */
  getAuditHistory(limit?: number): Promise<SAICycleEntry[]>;

  /** Get score trend analysis */
  getScoreTrend(): Promise<TrendAnalysis>;

  /** Get overall summary */
  getSummary(): Promise<SAIAuditSummary>;
}
