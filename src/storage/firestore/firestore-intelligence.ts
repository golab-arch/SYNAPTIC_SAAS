/**
 * Firestore Intelligence Storage — stub.
 */

// TODO: Implement in Phase 4

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
  async saveDecision(_tenantId: string, _projectId: string, _decision: DecisionRecord): Promise<void> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
  async getDecisions(_tenantId: string, _projectId: string, _limit?: number): Promise<DecisionRecord[]> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
  async saveLearning(_tenantId: string, _projectId: string, _learning: LearningEntry): Promise<void> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
  async getLearnings(_tenantId: string, _projectId: string): Promise<LearningEntry[]> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
  async updateLearning(_tenantId: string, _projectId: string, _learningId: string, _updates: Partial<LearningEntry>): Promise<void> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
  async appendBitacora(_tenantId: string, _projectId: string, _entry: BitacoraCycleEntry): Promise<void> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
  async getRecentBitacora(_tenantId: string, _projectId: string, _limit: number): Promise<BitacoraCycleEntry[]> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
  async getBitacoraIndex(_tenantId: string, _projectId: string): Promise<BitacoraIndex> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
  async getBitacoraFragment(_tenantId: string, _projectId: string, _fragmentId: string): Promise<string> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
  async getContextDocuments(_tenantId: string, _projectId: string): Promise<ContextDocument[]> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
  async getSession(_tenantId: string, _projectId: string): Promise<SynapticSession | null> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
  async updateSession(_tenantId: string, _projectId: string, _session: Partial<SynapticSession>): Promise<void> {
    throw new Error('FirestoreIntelligenceStorage not implemented');
  }
}
