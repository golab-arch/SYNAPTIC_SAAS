/**
 * FindingTracker — tracking + auto-resolution of SAI findings.
 * Adaptar de SYNAPTIC_EXPERT: packages/agent/src/services/sai-persistence.service.ts
 */

// TODO: Implement - adaptar de SYNAPTIC_EXPERT packages/agent/src/services/sai-persistence.service.ts

import type { Finding, ResolvedFinding, ISAIStorage } from './types.js';

export class FindingTracker {
  constructor(
    private readonly storage: ISAIStorage,
    private readonly tenantId: string,
    private readonly projectId: string,
  ) {}

  /**
   * Compare new findings against active findings to detect resolutions.
   */
  async detectResolutions(currentFindings: Finding[]): Promise<ResolvedFinding[]> {
    // TODO: Implement
    // Strategy:
    // 1. Get active findings from storage
    // 2. For each active finding, check if it still exists in current findings
    // 3. If not found, mark as resolved
    void currentFindings;
    throw new Error('FindingTracker.detectResolutions not implemented');
  }

  /**
   * Persist new findings and resolved findings.
   */
  async persistFindings(
    _newFindings: Finding[],
    _resolved: ResolvedFinding[],
    _cycle: number,
  ): Promise<void> {
    // TODO: Implement
    throw new Error('FindingTracker.persistFindings not implemented');
  }

  /**
   * Get all active (unresolved) findings.
   */
  async getActiveFindings(): Promise<Finding[]> {
    return this.storage.getActiveFindings(this.tenantId, this.projectId);
  }

  /**
   * Get all resolved findings.
   */
  async getResolvedFindings(): Promise<Finding[]> {
    return this.storage.getResolvedFindings(this.tenantId, this.projectId);
  }
}
