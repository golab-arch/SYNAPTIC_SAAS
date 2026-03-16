/**
 * Context Manager — reads context/ documents (REQUIREMENTS, ROADMAP, etc.).
 * Adaptar de SYNAPTIC_EXPERT: packages/agent/src/services/intelligence-manager.ts
 */

// TODO: Implement - adaptar de SYNAPTIC_EXPERT packages/agent/src/services/intelligence-manager.ts

import type { ContextDocument, IIntelligenceStorage } from './types.js';

export class ContextManager {
  constructor(
    private readonly storage: IIntelligenceStorage,
    private readonly tenantId: string,
    private readonly projectId: string,
  ) {}

  /**
   * Get all context documents for the project.
   */
  async getDocuments(): Promise<ContextDocument[]> {
    return this.storage.getContextDocuments(this.tenantId, this.projectId);
  }
}
