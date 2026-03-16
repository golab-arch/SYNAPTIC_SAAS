/**
 * Firestore Enforcement Storage — stub.
 */

// TODO: Implement in Phase 4

import type { IEnforcementStorage } from '../interfaces.js';
import type { ComplianceHistoryEntry, Violation } from '../../engines/enforcement/types.js';

export class FirestoreEnforcementStorage implements IEnforcementStorage {
  async saveComplianceEntry(
    _tenantId: string,
    _projectId: string,
    _entry: ComplianceHistoryEntry,
  ): Promise<void> {
    // TODO: Implement in Phase 4 — db.collection('tenants/{tenantId}/projects/{projectId}/compliance')
    throw new Error('FirestoreEnforcementStorage not implemented');
  }

  async getComplianceHistory(
    _tenantId: string,
    _projectId: string,
    _limit?: number,
  ): Promise<ComplianceHistoryEntry[]> {
    throw new Error('FirestoreEnforcementStorage not implemented');
  }

  async saveViolations(
    _tenantId: string,
    _projectId: string,
    _cycle: number,
    _violations: Violation[],
  ): Promise<void> {
    throw new Error('FirestoreEnforcementStorage not implemented');
  }
}
