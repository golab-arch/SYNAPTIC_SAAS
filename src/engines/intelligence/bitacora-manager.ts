/**
 * Bitacora Manager — fragmented bitacora with append/read/fragment.
 * NEW functionality for SaaS: max 500 lines per fragment.
 */

// TODO: Implement - new functionality for SYNAPTIC_SAAS

import type { BitacoraCycleEntry, BitacoraIndex, IIntelligenceStorage } from './types.js';
import { BITACORA_CONFIG } from './constants.js';

export class BitacoraManager {
  constructor(
    private readonly storage: IIntelligenceStorage,
    private readonly tenantId: string,
    private readonly projectId: string,
  ) {}

  /**
   * Append a cycle entry to the active bitacora fragment.
   * If the active fragment exceeds maxLinesPerFragment, create a new one.
   */
  async appendEntry(entry: BitacoraCycleEntry): Promise<void> {
    // TODO: Implement
    // 1. Get current bitacora index
    // 2. Check if active fragment needs rotation
    // 3. Append to active fragment
    // 4. Update index
    void BITACORA_CONFIG;
    await this.storage.appendBitacora(this.tenantId, this.projectId, entry);
  }

  /**
   * Get recent bitacora entries for prompt injection.
   */
  async getRecentEntries(limit?: number): Promise<BitacoraCycleEntry[]> {
    const effectiveLimit = limit ?? BITACORA_CONFIG.recentCyclesForPrompt;
    return this.storage.getRecentBitacora(this.tenantId, this.projectId, effectiveLimit);
  }

  /**
   * Get the bitacora index (fragment metadata).
   */
  async getIndex(): Promise<BitacoraIndex> {
    return this.storage.getBitacoraIndex(this.tenantId, this.projectId);
  }

  /**
   * Get a specific bitacora fragment by ID.
   */
  async getFragment(fragmentId: string): Promise<string> {
    return this.storage.getBitacoraFragment(this.tenantId, this.projectId, fragmentId);
  }
}
