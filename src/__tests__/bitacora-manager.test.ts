/**
 * BitacoraManager tests — tome-based system (DG-126 Phase 2C).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BitacoraManager } from '../engines/intelligence/bitacora-manager.js';
import { InMemoryIntelligenceStorage } from '../storage/memory/memory-intelligence.js';
import type { BitacoraCycleEntry } from '../engines/intelligence/types.js';

function makeEntry(cycleId: number, result: BitacoraCycleEntry['result'] = 'SUCCESS'): BitacoraCycleEntry {
  return {
    cycleId,
    traceId: `trace-${cycleId}`,
    timestamp: new Date().toISOString(),
    phase: 'execution',
    result,
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

  it('should return only last N entries', async () => {
    for (let i = 1; i <= 30; i++) {
      await manager.appendEntry(makeEntry(i));
    }
    const entries = await manager.getRecentEntries(15);
    expect(entries.length).toBeLessThanOrEqual(15);
  });

  it('should get index with tome structure', async () => {
    await manager.appendEntry(makeEntry(1));
    const index = await manager.getIndex();
    expect(index.version).toBe('2.0');
    expect(index.totalCycles).toBe(1);
    expect(index.tomes.length).toBeGreaterThanOrEqual(1);
    expect(index.currentTomeId).toBe('tome-001');
  });

  it('should update aggregate metrics', async () => {
    await manager.appendEntry(makeEntry(1, 'SUCCESS'));
    await manager.appendEntry(makeEntry(2, 'PARTIAL'));
    await manager.appendEntry(makeEntry(3, 'ERROR'));
    const index = await manager.getIndex();
    expect(index.metrics.totalCycles).toBe(3);
    expect(index.metrics.successCount).toBe(1);
    expect(index.metrics.partialCount).toBe(1);
    expect(index.metrics.failureCount).toBe(1);
  });

  it('should track decisions in index', async () => {
    const entry = makeEntry(1);
    const withDecision = {
      ...entry,
      optionSelected: { option: 'A', title: 'Use TypeScript' },
    };
    await manager.appendEntry(withDecision);
    const index = await manager.getIndex();
    expect(index.decisionIndex).toHaveLength(1);
    expect(index.decisionIndex[0]!.optionSelected).toBe('A');
    expect(index.metrics.decisionCount).toBe(1);
    expect(index.metrics.optionDistribution['A']).toBe(1);
  });

  it('should generate smart summary', async () => {
    for (let i = 1; i <= 5; i++) {
      await manager.appendEntry(makeEntry(i));
    }
    const summary = await manager.getSmartSummary();
    expect(summary).toContain('BITACORA HISTORY');
    expect(summary).toContain('Total cycles: 5');
    expect(summary).toContain('Success rate: 100%');
    expect(summary).toContain('Cycle 1');
  });

  it('should return empty summary message for no cycles', async () => {
    const summary = await manager.getSmartSummary();
    expect(summary).toContain('Total cycles: 0');
  });
});
