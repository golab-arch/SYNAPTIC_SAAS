/**
 * Firestore Enforcement Storage — production adapter.
 */

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { IEnforcementStorage } from '../interfaces.js';
import type { ComplianceHistoryEntry, Violation } from '../../engines/enforcement/types.js';

export class FirestoreEnforcementStorage implements IEnforcementStorage {
  constructor(private readonly db: Firestore) {}

  private ref(tenantId: string, projectId: string) {
    return this.db.collection('tenants').doc(tenantId).collection('projects').doc(projectId);
  }

  async saveComplianceEntry(tenantId: string, projectId: string, entry: ComplianceHistoryEntry): Promise<void> {
    const docId = String(entry.cycle).padStart(6, '0');
    await this.ref(tenantId, projectId)
      .collection('compliance').doc(docId)
      .set({ ...entry, _savedAt: FieldValue.serverTimestamp() });
  }

  async getComplianceHistory(tenantId: string, projectId: string, limit = 50): Promise<ComplianceHistoryEntry[]> {
    const snap = await this.ref(tenantId, projectId)
      .collection('compliance').orderBy('cycle', 'desc').limit(limit).get();
    return snap.docs.map((d) => d.data() as ComplianceHistoryEntry).reverse();
  }

  async saveViolations(tenantId: string, projectId: string, cycle: number, violations: Violation[]): Promise<void> {
    const docId = String(cycle).padStart(6, '0');
    await this.ref(tenantId, projectId)
      .collection('violations').doc(docId)
      .set({ cycle, violations, _savedAt: FieldValue.serverTimestamp() });
  }
}
