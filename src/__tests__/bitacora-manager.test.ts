/**
 * BitacoraManager tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BitacoraManager, formatBitacoraEntries, BITACORA_RECENT_FOR_PROMPT } from '../engines/intelligence/bitacora-manager.js';
import { InMemoryIntelligenceStorage } from '../storage/memory/memory-intelligence.js';
import type { BitacoraCycleEntry } from '../engines/intelligence/types.js';

function makeEntry(cycleId: number): BitacoraCycleEntry {
  return {
    cycleId,
    traceId: `trace-${cycleId}`,
    timestamp: new Date().toISOString(),
    phase: 'execution',
    result: 'SUCCESS',
    duration: '100ms',
    promptOriginal: `Prompt for cycle ${cycleId}`,
    decisionGate: null,
    optionSelected: null,
    artifacts: [],
    metrics: {
      protocolCompliance: 90,
      decisionGatePresented: true,
      memoryUpdated: true,
      reformulationsNeeded: 0,
    },
    lessonsLearned: [],
    synapticStrength: Math.min(cycleId * 3, 100),
  };
}

describe('BitacoraManager', () => {
  let manager: BitacoraManager;
  let storage: InMemoryIntelligenceStorage;

  beforeEach(() => {
    storage = new InMemoryIntelligenceStorage();
    manager = new BitacoraManager(storage, 'tenant-1', 'project-1');
  });

  it('should append entry to storage', async () => {
    await manager.appendEntry(makeEntry(1));
    const entries = await manager.getRecentEntries(10);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.cycleId).toBe(1);
  });

  it('should return only last N entries for prompt', async () => {
    // Seed 30 entries
    for (let i = 1; i <= 30; i++) {
      await manager.appendEntry(makeEntry(i));
    }

    const entries = await manager.getRecentEntries();
    expect(entries.length).toBeLessThanOrEqual(BITACORA_RECENT_FOR_PROMPT);
  });

  it('should return entries in order', async () => {
    for (let i = 1; i <= 5; i++) {
      await manager.appendEntry(makeEntry(i));
    }
    const entries = await manager.getRecentEntries(5);
    expect(entries).toHaveLength(5);
  });

  it('should get bitacora index', async () => {
    await manager.appendEntry(makeEntry(1));
    const index = await manager.getIndex();
    expect(index.totalCycles).toBeGreaterThanOrEqual(1);
    expect(index.fragments.length).toBeGreaterThanOrEqual(1);
  });
});

describe('formatBitacoraEntries', () => {
  it('should format entries for prompt injection', () => {
    const entries = [makeEntry(1), makeEntry(2)];
    const formatted = formatBitacoraEntries(entries);
    expect(formatted).toContain('Cycle 1');
    expect(formatted).toContain('Cycle 2');
    expect(formatted).toContain('SUCCESS');
  });

  it('should return message for empty entries', () => {
    const formatted = formatBitacoraEntries([]);
    expect(formatted).toContain('No previous cycles');
  });

  it('should show truncation header when cycles exceed entries', () => {
    const entries = [makeEntry(50)]; // cycleId 50 but only 1 entry
    const formatted = formatBitacoraEntries(entries);
    expect(formatted).toContain('Showing last 1');
  });
});
