/**
 * Intelligence Engine types — Motor 3.
 * Persistent Learning Context: long-term memory with confidence system,
 * contradiction detection, fragmented bitacora, and session management.
 */

import type { IEngine } from '../types.js';

// ─── Configuration ──────────────────────────────────────────────

export interface IntelligenceConfig {
  readonly storage: IIntelligenceStorage;
  readonly confidence: {
    readonly injectionThreshold: number;
    readonly gracePeriod: number;
    readonly decayRate: number;
    readonly archiveThreshold: number;
    readonly maxInjected: number;
  };
  readonly bitacora: {
    readonly maxLinesPerFragment: number;
    readonly recentCyclesForPrompt: number;
  };
  readonly contradictionCategories: ContradictionCategory[];
}

// ─── Decisions ──────────────────────────────────────────────────

export interface DecisionOption {
  readonly title: string;
  readonly description: string;
  readonly pros: string[];
  readonly cons: string[];
  readonly risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DecisionRecord {
  readonly decisionId: string;
  readonly cycle: number;
  readonly timestamp: string;
  readonly decisionPoint: string;
  readonly options: {
    readonly optionA: DecisionOption;
    readonly optionB: DecisionOption;
    readonly optionC: DecisionOption;
  };
  readonly selectedOption: 'A' | 'B' | 'C';
  readonly userRationale?: string;
  readonly outcome?: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
}

// ─── Learnings ──────────────────────────────────────────────────

export type ConfidenceSource = 'EXPLICIT' | 'REPEATED' | 'INFERRED';

export interface LearningEntry {
  readonly id: string;
  readonly content: string;
  readonly category: string;
  confidence: {
    score: number;
    source: ConfidenceSource;
    evidenceCount: number;
    lastReinforced: string;
    lastReinforcedCycle: number;
  };
  readonly createdAt: string;
  readonly createdInCycle: number;
}

export interface Contradiction {
  readonly existingLearning: LearningEntry;
  readonly newLearning: LearningEntry;
  readonly category: string;
  readonly resolution: 'KEEP_EXISTING' | 'REPLACE' | 'CONFLICT';
}

export interface ContradictionCategory {
  readonly name: string;
  readonly mutuallyExclusive: readonly string[];
}

// ─── Bitacora ───────────────────────────────────────────────────

export interface BitacoraCycleEntry {
  readonly cycleId: number;
  readonly traceId: string;
  readonly timestamp: string;
  readonly phase: string;
  readonly result: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'ERROR' | 'SKIPPED';
  readonly duration: string;
  readonly promptOriginal: string;
  readonly decisionGate: {
    readonly optionA: string;
    readonly optionB: string;
    readonly optionC: string;
  } | null;
  readonly optionSelected: { readonly option: string; readonly title: string } | null;
  readonly artifacts: readonly string[];
  readonly metrics: {
    readonly protocolCompliance: number;
    readonly decisionGatePresented: boolean;
    readonly memoryUpdated: boolean;
    readonly reformulationsNeeded: number;
  };
  readonly lessonsLearned: readonly string[];
  readonly synapticStrength: number;
  readonly saiAudit?: {
    readonly score: number;
    readonly grade: string;
    readonly findingsCount: number;
  };
  // DG-126 Phase 2C: Full response archival
  readonly fullResponseText?: string;
  readonly parsedDecisionGate?: {
    readonly detected: boolean;
    readonly options: ReadonlyArray<{ id: string; title: string }>;
  };
  readonly model?: string;
  readonly provider?: string;
  readonly toolsUsed?: readonly string[];
}

// ─── Bitacora Index (Tome-based, DG-126 Phase 2C) ─────────────

export interface BitacoraIndex {
  readonly version: string;
  readonly projectId: string;
  readonly totalCycles: number;
  readonly currentTomeId: string;
  readonly cyclesPerTome: number;
  readonly tomes: readonly TomeEntry[];
  readonly decisionIndex: readonly DecisionIndexEntry[];
  readonly metrics: BitacoraAggregateMetrics;
  readonly lastUpdated: string;
}

export interface TomeEntry {
  readonly id: string;
  readonly startCycle: number;
  readonly endCycle: number | null;
  readonly cycleCount: number;
  readonly closed: boolean;
  readonly createdAt: string;
  readonly closedAt?: string;
}

export interface DecisionIndexEntry {
  readonly cycle: number;
  readonly optionSelected: string;
  readonly title: string;
  readonly timestamp: string;
}

export interface BitacoraAggregateMetrics {
  readonly totalCycles: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly partialCount: number;
  readonly avgComplianceScore: number;
  readonly decisionCount: number;
  readonly optionDistribution: Record<string, number>;
}

// ─── Context ────────────────────────────────────────────────────

export interface ContextDocument {
  readonly name: string;
  readonly content: string;
  readonly lastModified: string;
}

export interface IntelligenceSummary {
  readonly recentDecisions: DecisionRecord[];
  readonly topLearnings: LearningEntry[];
  readonly currentCycle: number;
  readonly synapticStrength: number;
}

// ─── Session ────────────────────────────────────────────────────

export interface SynapticSession {
  readonly sessionId: string;
  currentCycle: number;
  synapticStrength: number;
  readonly enforcement: { readonly mode: string };
  agentState: {
    complianceScore: number;
    violationsCount: number;
    successfulCycles: number;
  };
}

// ─── Storage Interface ──────────────────────────────────────────

export interface IIntelligenceStorage {
  // Decisions
  saveDecision(tenantId: string, projectId: string, decision: DecisionRecord): Promise<void>;
  getDecisions(tenantId: string, projectId: string, limit?: number): Promise<DecisionRecord[]>;

  // Learnings
  saveLearning(tenantId: string, projectId: string, learning: LearningEntry): Promise<void>;
  getLearnings(tenantId: string, projectId: string): Promise<LearningEntry[]>;
  updateLearning(
    tenantId: string,
    projectId: string,
    learningId: string,
    updates: Partial<LearningEntry>,
  ): Promise<void>;

  // Bitacora
  appendBitacora(
    tenantId: string,
    projectId: string,
    entry: BitacoraCycleEntry,
  ): Promise<void>;
  getRecentBitacora(
    tenantId: string,
    projectId: string,
    limit: number,
  ): Promise<BitacoraCycleEntry[]>;

  // Bitacora fragments
  getBitacoraIndex(tenantId: string, projectId: string): Promise<BitacoraIndex>;
  getBitacoraFragment(tenantId: string, projectId: string, fragmentId: string): Promise<string>;

  // Context
  getContextDocuments(tenantId: string, projectId: string): Promise<ContextDocument[]>;

  // Session
  getSession(tenantId: string, projectId: string): Promise<SynapticSession | null>;
  updateSession(
    tenantId: string,
    projectId: string,
    session: Partial<SynapticSession>,
  ): Promise<void>;
}

// ─── Engine Interface ───────────────────────────────────────────

export interface IIntelligenceEngine extends IEngine {
  initialize(config: IntelligenceConfig): Promise<void>;

  // Decisions
  recordDecision(decision: DecisionRecord): Promise<void>;
  getDecisions(limit?: number): Promise<DecisionRecord[]>;

  // Learnings
  addLearning(learning: LearningEntry): Promise<void>;
  getLearnings(options?: { minConfidence?: number; limit?: number }): Promise<LearningEntry[]>;
  reinforceLearning(learningId: string, source: ConfidenceSource): Promise<void>;
  /** DG-126 Phase 3B: Direct confidence update (for boost/degrade/forget/restore) */
  updateLearningConfidence(learningId: string, score: number, source?: ConfidenceSource): Promise<boolean>;
  applyDecay(currentCycle: number): Promise<number>;
  detectContradictions(newLearning: LearningEntry): Promise<Contradiction[]>;

  // Bitacora
  appendBitacora(entry: BitacoraCycleEntry): Promise<void>;
  getRecentBitacora(limit?: number): Promise<BitacoraCycleEntry[]>;
  getBitacoraFragment(fragmentId: string): Promise<string>;
  getBitacoraIndex(): Promise<BitacoraIndex>;

  // Context
  getContextDocuments(): Promise<ContextDocument[]>;
  getIntelligenceSummary(): Promise<IntelligenceSummary>;

  // Session
  getSession(): Promise<SynapticSession>;
  updateSession(updates: Partial<SynapticSession>): Promise<void>;
  incrementCycle(): Promise<number>;
  /** DG-126: peek at next cycle number without committing it */
  peekNextCycle(): Promise<number>;
  /** DG-126 Phase 2C: Smart bitacora summary (metrics + recent + decisions) */
  getSmartBitacoraSummary(): Promise<string>;
  /** DG-126 Phase 2C: Archive old items to prevent unbounded growth */
  archiveOldItems(currentCycle: number): Promise<number>;
}
