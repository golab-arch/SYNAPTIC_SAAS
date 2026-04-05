/**
 * IntelligenceEngine — Motor 3 main class (facade over sub-modules).
 * Adaptar de SYNAPTIC_EXPERT: packages/agent/src/services/intelligence-manager.ts
 */

// TODO: Implement - adaptar de SYNAPTIC_EXPERT packages/agent/src/services/intelligence-manager.ts

import type {
  IIntelligenceEngine,
  IntelligenceConfig,
  DecisionRecord,
  LearningEntry,
  ConfidenceSource,
  Contradiction,
  BitacoraCycleEntry,
  BitacoraIndex,
  ContextDocument,
  IntelligenceSummary,
  SynapticSession,
} from './types.js';
import { DecisionRecorder } from './decision-recorder.js';
import { LearningManager } from './learning-manager.js';
import { BitacoraManager } from './bitacora-manager.js';
import { ContextManager } from './context-manager.js';
import { SessionManager } from './session-manager.js';

export class IntelligenceEngine implements IIntelligenceEngine {
  private config: IntelligenceConfig | null = null;
  private decisions!: DecisionRecorder;
  private learnings!: LearningManager;
  private bitacora!: BitacoraManager;
  private context!: ContextManager;
  private session!: SessionManager;

  async initialize(config: IntelligenceConfig): Promise<void> {
    this.config = config;
    // Sub-modules will be initialized with tenant scope when execute() is called
    // For now, use placeholder scope
    const tenantId = 'default';
    const projectId = 'default';

    this.decisions = new DecisionRecorder(config.storage, tenantId, projectId);
    this.learnings = new LearningManager(
      config.storage, tenantId, projectId, config.contradictionCategories,
    );
    this.bitacora = new BitacoraManager(config.storage, tenantId, projectId);
    this.context = new ContextManager(config.storage, tenantId, projectId);
    this.session = new SessionManager(config.storage, tenantId, projectId);
  }

  async dispose(): Promise<void> {
    this.config = null;
  }

  // ─── Decisions ──────────────────────────────────────────────

  async recordDecision(decision: DecisionRecord): Promise<void> {
    await this.decisions.record(decision);
  }

  async getDecisions(limit?: number): Promise<DecisionRecord[]> {
    return this.decisions.getDecisions(limit);
  }

  // ─── Learnings ──────────────────────────────────────────────

  async addLearning(learning: LearningEntry): Promise<void> {
    const session = await this.session.getSession();
    await this.learnings.addLearning(learning, session.currentCycle);
  }

  async getLearnings(options?: { minConfidence?: number; limit?: number }): Promise<LearningEntry[]> {
    return this.learnings.getLearnings(options);
  }

  async reinforceLearning(learningId: string, source: ConfidenceSource): Promise<void> {
    const session = await this.session.getSession();
    await this.learnings.reinforceLearning(learningId, source, session.currentCycle);
  }

  async updateLearningConfidence(learningId: string, score: number, source?: ConfidenceSource): Promise<boolean> {
    const all = await this.learnings.getLearnings();
    const learning = all.find((l) => l.id === learningId);
    if (!learning) return false;
    learning.confidence.score = Math.max(0, Math.min(1.0, score));
    if (source) learning.confidence.source = source;
    // Use the config.storage directly (same storage instance used by LearningManager)
    await this.config!.storage.updateLearning('default', 'default', learningId, learning);
    return true;
  }

  async applyDecay(currentCycle: number): Promise<number> {
    return this.learnings.applyDecay(currentCycle);
  }

  async detectContradictions(newLearning: LearningEntry): Promise<Contradiction[]> {
    return this.learnings.detectContradictions(newLearning);
  }

  // ─── Bitacora ───────────────────────────────────────────────

  async appendBitacora(entry: BitacoraCycleEntry): Promise<void> {
    await this.bitacora.appendEntry(entry);
  }

  async getRecentBitacora(limit?: number): Promise<BitacoraCycleEntry[]> {
    return this.bitacora.getRecentEntries(limit);
  }

  async getBitacoraFragment(fragmentId: string): Promise<string> {
    return this.bitacora.getFragment(fragmentId);
  }

  async getBitacoraIndex(): Promise<BitacoraIndex> {
    return this.bitacora.getIndex();
  }

  // ─── Context ────────────────────────────────────────────────

  async getContextDocuments(): Promise<ContextDocument[]> {
    return this.context.getDocuments();
  }

  async getIntelligenceSummary(): Promise<IntelligenceSummary> {
    const [decisions, learnings, session] = await Promise.all([
      this.getDecisions(10),
      this.getLearnings({
        minConfidence: this.config?.confidence.injectionThreshold ?? 0.5,
        limit: this.config?.confidence.maxInjected ?? 10,
      }),
      this.session.getSession(),
    ]);

    return {
      recentDecisions: decisions,
      topLearnings: learnings,
      currentCycle: session.currentCycle,
      synapticStrength: session.synapticStrength,
    };
  }

  // ─── Session ────────────────────────────────────────────────

  async getSession(): Promise<SynapticSession> {
    return this.session.getSession();
  }

  async updateSession(updates: Partial<SynapticSession>): Promise<void> {
    await this.session.updateSession(updates);
  }

  async incrementCycle(): Promise<number> {
    return this.session.incrementCycle();
  }

  async peekNextCycle(): Promise<number> {
    return this.session.peekNextCycle();
  }

  async getSmartBitacoraSummary(): Promise<string> {
    return this.bitacora.getSmartSummary();
  }

  async archiveOldItems(currentCycle: number): Promise<number> {
    const ARCHIVE_AGE = 50;
    let archived = 0;

    // Archive old successful decisions
    const decisions = await this.getDecisions();
    const old = decisions.filter(
      (d) => d.outcome === 'SUCCESS' && (currentCycle - d.cycle) > ARCHIVE_AGE,
    );
    archived += old.length;
    // Note: actual removal deferred to storage layer — for now count only

    // Low-confidence learnings are already archived by the decay system (Step 2)
    return archived;
  }
}
