/**
 * In-memory SAI Storage — FUNCTIONAL (Map-based).
 * For development and testing without Firestore.
 */

import type { ISAIStorage } from '../interfaces.js';
import type { SAIAuditResult, SAICycleEntry, Finding } from '../../engines/sai/types.js';

export class InMemorySAIStorage implements ISAIStorage {
  private auditHistory = new Map<string, SAICycleEntry[]>();
  private findings = new Map<string, Finding[]>();

  private key(tenantId: string, projectId: string): string {
    return `${tenantId}:${projectId}`;
  }

  async saveAuditResult(
    tenantId: string,
    projectId: string,
    result: SAIAuditResult,
    cycle: number,
  ): Promise<void> {
    const k = this.key(tenantId, projectId);
    const entries = this.auditHistory.get(k) ?? [];
    entries.push({
      cycle,
      score: result.score,
      grade: result.grade,
      findingsCount: result.findings.length,
      resolvedCount: 0,
      timestamp: new Date().toISOString(),
    });
    this.auditHistory.set(k, entries);
  }

  async getAuditHistory(
    tenantId: string,
    projectId: string,
    limit?: number,
  ): Promise<SAICycleEntry[]> {
    const k = this.key(tenantId, projectId);
    const entries = this.auditHistory.get(k) ?? [];
    if (limit != null) return entries.slice(-limit);
    return [...entries];
  }

  async saveFindings(tenantId: string, projectId: string, newFindings: Finding[]): Promise<void> {
    const k = this.key(tenantId, projectId);
    const existing = this.findings.get(k) ?? [];
    // Merge: update existing by ID, add new
    for (const finding of newFindings) {
      const idx = existing.findIndex((f) => f.id === finding.id);
      if (idx >= 0) {
        existing[idx] = finding;
      } else {
        existing.push(finding);
      }
    }
    this.findings.set(k, existing);
  }

  async getActiveFindings(tenantId: string, projectId: string): Promise<Finding[]> {
    const k = this.key(tenantId, projectId);
    const all = this.findings.get(k) ?? [];
    return all.filter((f) => f.status === 'OPEN');
  }

  async getResolvedFindings(tenantId: string, projectId: string): Promise<Finding[]> {
    const k = this.key(tenantId, projectId);
    const all = this.findings.get(k) ?? [];
    return all.filter((f) => f.status === 'RESOLVED');
  }

  async updateFinding(
    tenantId: string,
    projectId: string,
    findingId: string,
    updates: Partial<Finding>,
  ): Promise<void> {
    const k = this.key(tenantId, projectId);
    const all = this.findings.get(k) ?? [];
    const finding = all.find((f) => f.id === findingId);
    if (finding) {
      Object.assign(finding, updates);
    }
  }
}
