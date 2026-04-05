/**
 * Firestore Intelligence Storage — production adapter.
 * Collection: tenants/{tenantId}/projects/{projectId}/...
 */

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { IIntelligenceStorage } from '../interfaces.js';
import type {
  DecisionRecord,
  LearningEntry,
  BitacoraCycleEntry,
  BitacoraIndex,
  ContextDocument,
  SynapticSession,
} from '../../engines/intelligence/types.js';

export class FirestoreIntelligenceStorage implements IIntelligenceStorage {
  constructor(private readonly db: Firestore) {}

  private ref(tenantId: string, projectId: string) {
    return this.db.collection('tenants').doc(tenantId).collection('projects').doc(projectId);
  }

  // ── Decisions ──
  async saveDecision(tenantId: string, projectId: string, decision: DecisionRecord): Promise<void> {
    await this.ref(tenantId, projectId)
      .collection('decisions').doc(decision.decisionId)
      .set({ ...decision, _savedAt: FieldValue.serverTimestamp() });
  }

  async getDecisions(tenantId: string, projectId: string, limit = 50): Promise<DecisionRecord[]> {
    const snap = await this.ref(tenantId, projectId)
      .collection('decisions').orderBy('cycle', 'desc').limit(limit).get();
    return snap.docs.map((d) => d.data() as DecisionRecord);
  }

  // ── Learnings ──
  async saveLearning(tenantId: string, projectId: string, learning: LearningEntry): Promise<void> {
    await this.ref(tenantId, projectId)
      .collection('learnings').doc(learning.id)
      .set({ ...learning, _savedAt: FieldValue.serverTimestamp() });
  }

  async getLearnings(tenantId: string, projectId: string): Promise<LearningEntry[]> {
    const snap = await this.ref(tenantId, projectId).collection('learnings').get();
    return snap.docs.map((d) => d.data() as LearningEntry);
  }

  async updateLearning(tenantId: string, projectId: string, learningId: string, updates: Partial<LearningEntry>): Promise<void> {
    await this.ref(tenantId, projectId).collection('learnings').doc(learningId).update(updates);
  }

  // ── Bitacora ──
  async appendBitacora(tenantId: string, projectId: string, entry: BitacoraCycleEntry): Promise<void> {
    const docId = String(entry.cycleId).padStart(6, '0');
    await this.ref(tenantId, projectId).collection('bitacora').doc(docId).set(entry);
  }

  async getRecentBitacora(tenantId: string, projectId: string, limit: number): Promise<BitacoraCycleEntry[]> {
    const snap = await this.ref(tenantId, projectId)
      .collection('bitacora').orderBy('cycleId', 'desc').limit(limit).get();
    return snap.docs.map((d) => d.data() as BitacoraCycleEntry).reverse();
  }

  async getBitacoraIndex(tenantId: string, projectId: string): Promise<BitacoraIndex> {
    const snap = await this.ref(tenantId, projectId).collection('bitacora').count().get();
    const total = snap.data().count;
    return {
      version: '2.0',
      projectId,
      totalCycles: total,
      currentTomeId: 'tome-001',
      cyclesPerTome: 50,
      tomes: [{ id: 'tome-001', startCycle: 1, endCycle: null, cycleCount: total, closed: false, createdAt: new Date().toISOString() }],
      decisionIndex: [],
      metrics: { totalCycles: total, successCount: 0, failureCount: 0, partialCount: 0, avgComplianceScore: 0, decisionCount: 0, optionDistribution: {} },
      lastUpdated: new Date().toISOString(),
    };
  }

  async getBitacoraFragment(tenantId: string, projectId: string, _fragmentId: string): Promise<string> {
    const entries = await this.getRecentBitacora(tenantId, projectId, 500);
    return JSON.stringify(entries, null, 2);
  }

  // ── Context ──
  async getContextDocuments(tenantId: string, projectId: string): Promise<ContextDocument[]> {
    const snap = await this.ref(tenantId, projectId).collection('context').get();
    return snap.docs.map((d) => d.data() as ContextDocument);
  }

  // ── Session ──
  async getSession(tenantId: string, projectId: string): Promise<SynapticSession | null> {
    const doc = await this.ref(tenantId, projectId).collection('sessions').doc('current').get();
    return doc.exists ? (doc.data() as SynapticSession) : null;
  }

  async updateSession(tenantId: string, projectId: string, updates: Partial<SynapticSession>): Promise<void> {
    await this.ref(tenantId, projectId).collection('sessions').doc('current').set(updates, { merge: true });
  }
}
