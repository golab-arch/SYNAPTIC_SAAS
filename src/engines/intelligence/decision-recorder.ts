/**
 * Decision Recorder — CRUD for Decision Gate records.
 * Adaptar de SYNAPTIC_EXPERT: packages/agent/src/services/intelligence-manager.ts
 */

// TODO: Implement - adaptar de SYNAPTIC_EXPERT packages/agent/src/services/intelligence-manager.ts

import type { DecisionRecord, IIntelligenceStorage } from './types.js';

export class DecisionRecorder {
  constructor(
    private readonly storage: IIntelligenceStorage,
    private readonly tenantId: string,
    private readonly projectId: string,
  ) {}

  async record(decision: DecisionRecord): Promise<void> {
    // TODO: Implement
    await this.storage.saveDecision(this.tenantId, this.projectId, decision);
  }

  async getDecisions(limit?: number): Promise<DecisionRecord[]> {
    return this.storage.getDecisions(this.tenantId, this.projectId, limit);
  }
}
