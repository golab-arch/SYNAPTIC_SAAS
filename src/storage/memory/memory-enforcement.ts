/**
 * In-memory Enforcement Storage — FUNCTIONAL (Map-based).
 * For development and testing without Firestore.
 */

import type { IEnforcementStorage } from '../interfaces.js';
import type { ComplianceHistoryEntry, Violation } from '../../engines/enforcement/types.js';

export class InMemoryEnforcementStorage implements IEnforcementStorage {
  private history = new Map<string, ComplianceHistoryEntry[]>();
  private violations = new Map<string, Map<number, Violation[]>>();

  private key(tenantId: string, projectId: string): string {
    return `${tenantId}:${projectId}`;
  }

  async saveComplianceEntry(
    tenantId: string,
    projectId: string,
    entry: ComplianceHistoryEntry,
  ): Promise<void> {
    const k = this.key(tenantId, projectId);
    const entries = this.history.get(k) ?? [];
    entries.push(entry);
    this.history.set(k, entries);
  }

  async getComplianceHistory(
    tenantId: string,
    projectId: string,
    limit?: number,
  ): Promise<ComplianceHistoryEntry[]> {
    const k = this.key(tenantId, projectId);
    const entries = this.history.get(k) ?? [];
    if (limit != null) {
      return entries.slice(-limit);
    }
    return [...entries];
  }

  async saveViolations(
    tenantId: string,
    projectId: string,
    cycle: number,
    violations: Violation[],
  ): Promise<void> {
    const k = this.key(tenantId, projectId);
    let cycleMap = this.violations.get(k);
    if (!cycleMap) {
      cycleMap = new Map();
      this.violations.set(k, cycleMap);
    }
    cycleMap.set(cycle, violations);
  }
}
