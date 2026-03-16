/**
 * In-memory Intelligence Storage — FUNCTIONAL (Map-based).
 * For development and testing without Firestore.
 */

import type { IIntelligenceStorage } from '../interfaces.js';
import type {
  DecisionRecord,
  LearningEntry,
  BitacoraCycleEntry,
  BitacoraIndex,
  ContextDocument,
  SynapticSession,
} from '../../engines/intelligence/types.js';

export class InMemoryIntelligenceStorage implements IIntelligenceStorage {
  private decisions = new Map<string, DecisionRecord[]>();
  private learnings = new Map<string, LearningEntry[]>();
  private bitacora = new Map<string, BitacoraCycleEntry[]>();
  private contexts = new Map<string, ContextDocument[]>();
  private sessions = new Map<string, SynapticSession>();

  private key(tenantId: string, projectId: string): string {
    return `${tenantId}:${projectId}`;
  }

  // ─── Decisions ──────────────────────────────────────────────

  async saveDecision(tenantId: string, projectId: string, decision: DecisionRecord): Promise<void> {
    const k = this.key(tenantId, projectId);
    const list = this.decisions.get(k) ?? [];
    list.push(decision);
    this.decisions.set(k, list);
  }

  async getDecisions(tenantId: string, projectId: string, limit?: number): Promise<DecisionRecord[]> {
    const k = this.key(tenantId, projectId);
    const list = this.decisions.get(k) ?? [];
    if (limit != null) return list.slice(-limit);
    return [...list];
  }

  // ─── Learnings ──────────────────────────────────────────────

  async saveLearning(tenantId: string, projectId: string, learning: LearningEntry): Promise<void> {
    const k = this.key(tenantId, projectId);
    const list = this.learnings.get(k) ?? [];
    list.push(learning);
    this.learnings.set(k, list);
  }

  async getLearnings(tenantId: string, projectId: string): Promise<LearningEntry[]> {
    const k = this.key(tenantId, projectId);
    return [...(this.learnings.get(k) ?? [])];
  }

  async updateLearning(
    tenantId: string,
    projectId: string,
    learningId: string,
    updates: Partial<LearningEntry>,
  ): Promise<void> {
    const k = this.key(tenantId, projectId);
    const list = this.learnings.get(k) ?? [];
    const learning = list.find((l) => l.id === learningId);
    if (learning) {
      Object.assign(learning, updates);
    }
  }

  // ─── Bitacora ───────────────────────────────────────────────

  async appendBitacora(
    tenantId: string,
    projectId: string,
    entry: BitacoraCycleEntry,
  ): Promise<void> {
    const k = this.key(tenantId, projectId);
    const list = this.bitacora.get(k) ?? [];
    list.push(entry);
    this.bitacora.set(k, list);
  }

  async getRecentBitacora(
    tenantId: string,
    projectId: string,
    limit: number,
  ): Promise<BitacoraCycleEntry[]> {
    const k = this.key(tenantId, projectId);
    const list = this.bitacora.get(k) ?? [];
    return list.slice(-limit);
  }

  async getBitacoraIndex(tenantId: string, projectId: string): Promise<BitacoraIndex> {
    const k = this.key(tenantId, projectId);
    const list = this.bitacora.get(k) ?? [];
    return {
      fragments: [
        {
          id: '001',
          startCycle: list.length > 0 ? list[0]!.cycleId : 1,
          endCycle: null,
          lines: list.length * 20, // rough estimate
          closed: false,
        },
      ],
      totalCycles: list.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getBitacoraFragment(
    tenantId: string,
    projectId: string,
    _fragmentId: string,
  ): Promise<string> {
    const k = this.key(tenantId, projectId);
    const list = this.bitacora.get(k) ?? [];
    return JSON.stringify(list, null, 2);
  }

  // ─── Context ────────────────────────────────────────────────

  async getContextDocuments(tenantId: string, projectId: string): Promise<ContextDocument[]> {
    const k = this.key(tenantId, projectId);
    return [...(this.contexts.get(k) ?? [])];
  }

  // ─── Session ────────────────────────────────────────────────

  async getSession(tenantId: string, projectId: string): Promise<SynapticSession | null> {
    const k = this.key(tenantId, projectId);
    return this.sessions.get(k) ?? null;
  }

  async updateSession(
    tenantId: string,
    projectId: string,
    updates: Partial<SynapticSession>,
  ): Promise<void> {
    const k = this.key(tenantId, projectId);
    const existing = this.sessions.get(k) ?? {
      sessionId: k,
      currentCycle: 0,
      synapticStrength: 0,
      enforcement: { mode: 'STRICT' },
      agentState: { complianceScore: 100, violationsCount: 0, successfulCycles: 0 },
    };
    Object.assign(existing, updates);
    this.sessions.set(k, existing);
  }
}
