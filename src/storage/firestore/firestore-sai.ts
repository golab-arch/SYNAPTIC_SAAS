/**
 * Firestore SAI Storage — production adapter.
 */

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { ISAIStorage } from '../interfaces.js';
import type { SAIAuditResult, SAICycleEntry, Finding } from '../../engines/sai/types.js';

export class FirestoreSAIStorage implements ISAIStorage {
  constructor(private readonly db: Firestore) {}

  private ref(tenantId: string, projectId: string) {
    return this.db.collection('tenants').doc(tenantId).collection('projects').doc(projectId);
  }

  async saveAuditResult(tenantId: string, projectId: string, result: SAIAuditResult, cycle: number): Promise<void> {
    const docId = String(cycle).padStart(6, '0');
    await this.ref(tenantId, projectId)
      .collection('audit_history').doc(docId)
      .set({ cycle, score: result.score, grade: result.grade, findingsCount: result.findings.length, filesAudited: result.filesAudited, timestamp: new Date().toISOString(), _savedAt: FieldValue.serverTimestamp() });
  }

  async getAuditHistory(tenantId: string, projectId: string, limit = 50): Promise<SAICycleEntry[]> {
    const snap = await this.ref(tenantId, projectId)
      .collection('audit_history').orderBy('cycle', 'desc').limit(limit).get();
    return snap.docs.map((d) => d.data() as SAICycleEntry).reverse();
  }

  async saveFindings(tenantId: string, projectId: string, findings: Finding[]): Promise<void> {
    const batch = this.db.batch();
    const col = this.ref(tenantId, projectId).collection('findings');
    for (const f of findings) {
      batch.set(col.doc(f.id), f);
    }
    await batch.commit();
  }

  async getActiveFindings(tenantId: string, projectId: string): Promise<Finding[]> {
    const snap = await this.ref(tenantId, projectId)
      .collection('findings').where('status', '==', 'OPEN').get();
    return snap.docs.map((d) => d.data() as Finding);
  }

  async getResolvedFindings(tenantId: string, projectId: string): Promise<Finding[]> {
    const snap = await this.ref(tenantId, projectId)
      .collection('findings').where('status', '==', 'RESOLVED').get();
    return snap.docs.map((d) => d.data() as Finding);
  }

  async updateFinding(tenantId: string, projectId: string, findingId: string, updates: Partial<Finding>): Promise<void> {
    await this.ref(tenantId, projectId).collection('findings').doc(findingId).update(updates);
  }
}
