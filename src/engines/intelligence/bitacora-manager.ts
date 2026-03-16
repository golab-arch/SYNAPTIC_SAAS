/**
 * Bitacora Manager — fragmented bitacora with append/read/archive.
 * Max 500 entries per active fragment; older entries are archived.
 */

import type { BitacoraCycleEntry, BitacoraIndex, IIntelligenceStorage } from './types.js';

export const BITACORA_MAX_ACTIVE_ENTRIES = 500;
export const BITACORA_RECENT_FOR_PROMPT = 15;

export class BitacoraManager {
  constructor(
    private readonly storage: IIntelligenceStorage,
    private readonly tenantId: string,
    private readonly projectId: string,
  ) {}

  /**
   * Append a cycle entry and auto-fragment if needed.
   */
  async appendEntry(entry: BitacoraCycleEntry): Promise<void> {
    await this.storage.appendBitacora(this.tenantId, this.projectId, entry);
  }

  /**
   * Get recent entries for prompt injection (max 15).
   */
  async getRecentEntries(limit?: number): Promise<BitacoraCycleEntry[]> {
    const effectiveLimit = limit ?? BITACORA_RECENT_FOR_PROMPT;
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

/**
 * Format bitacora entries for prompt injection.
 */
export function formatBitacoraEntries(entries: BitacoraCycleEntry[]): string {
  if (entries.length === 0) return 'No previous cycles recorded.';

  const lines: string[] = [];
  const latestCycle = entries[0]?.cycleId ?? 0;

  if (latestCycle > entries.length) {
    lines.push(`> Showing last ${entries.length} of ~${latestCycle} cycles.\n`);
  }

  for (const entry of entries) {
    lines.push(`**Cycle ${entry.cycleId}** (${entry.timestamp}): ${entry.result}`);
    if (entry.promptOriginal) {
      lines.push(`  Prompt: ${entry.promptOriginal.substring(0, 150)}...`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
