/**
 * BitacoraManager — Tome-based chronological logging.
 * INDEX tracks all tomes + aggregate metrics.
 * Current tome holds max 50 cycles. Auto-rotation on overflow.
 * Ported from VSC_EXTENSION bitacora-service.ts (DG-126 Phase 2C).
 */

import type {
  BitacoraCycleEntry,
  BitacoraIndex,
  TomeEntry,
  BitacoraAggregateMetrics,
  IIntelligenceStorage,
} from './types.js';

const CYCLES_PER_TOME = 50;

export class BitacoraManager {
  private index: BitacoraIndex | null = null;

  constructor(
    private readonly storage: IIntelligenceStorage,
    private readonly tenantId: string,
    private readonly projectId: string,
  ) {}

  /**
   * Append a cycle entry. Updates index metrics. Rotates tome if needed.
   */
  async appendEntry(entry: BitacoraCycleEntry): Promise<void> {
    const index = await this.getOrCreateIndex();

    // Update aggregate metrics
    const metrics = updateMetrics(index.metrics, entry);

    // Track decision if present
    const decisionIndex = [...index.decisionIndex];
    if (entry.optionSelected) {
      decisionIndex.push({
        cycle: entry.cycleId,
        optionSelected: entry.optionSelected.option,
        title: entry.optionSelected.title,
        timestamp: entry.timestamp,
      });
    }

    // Update current tome
    const tomes: TomeEntry[] = index.tomes.map((t) => ({ ...t }));
    const currentIdx = tomes.findIndex((t) => t.id === index.currentTomeId);
    let currentTomeId = index.currentTomeId;

    if (currentIdx >= 0) {
      const current = tomes[currentIdx]!;
      tomes[currentIdx] = { ...current, cycleCount: current.cycleCount + 1, endCycle: entry.cycleId };

      // Rotate if full
      if (tomes[currentIdx]!.cycleCount >= CYCLES_PER_TOME) {
        tomes[currentIdx] = { ...tomes[currentIdx]!, closed: true, closedAt: new Date().toISOString() };
        const newId = `tome-${String(tomes.length + 1).padStart(3, '0')}`;
        tomes.push({
          id: newId,
          startCycle: entry.cycleId + 1,
          endCycle: null,
          cycleCount: 0,
          closed: false,
          createdAt: new Date().toISOString(),
        });
        currentTomeId = newId;
      }
    }

    // Persist entry via storage
    await this.storage.appendBitacora(this.tenantId, this.projectId, entry);

    // Update cached index
    this.index = {
      ...index,
      totalCycles: index.totalCycles + 1,
      currentTomeId,
      tomes,
      decisionIndex,
      metrics,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Smart summary: metrics + last 10 cycles + last 5 decisions.
   * Used for system prompt injection (replaces flat bitacora formatting).
   */
  async getSmartSummary(): Promise<string> {
    const index = await this.getOrCreateIndex();
    const recent = await this.getRecentEntries(10);

    const m = index.metrics;
    const lines: string[] = [
      '=== BITACORA HISTORY ===',
      '',
      `Total cycles: ${m.totalCycles}`,
      `Success rate: ${m.totalCycles > 0 ? Math.round((m.successCount / m.totalCycles) * 100) : 0}%`,
      `Avg compliance: ${Math.round(m.avgComplianceScore)}`,
      `Decisions made: ${m.decisionCount}`,
    ];

    if (Object.keys(m.optionDistribution).length > 0) {
      const dist = Object.entries(m.optionDistribution).map(([k, v]) => `${k}:${v}`).join(', ');
      lines.push(`Option distribution: ${dist}`);
    }

    const currentTome = index.tomes.find((t) => t.id === index.currentTomeId);
    if (currentTome) {
      lines.push(`Current tome: ${currentTome.id} (${currentTome.cycleCount}/${CYCLES_PER_TOME} cycles)`);
    }

    if (recent.length > 0) {
      lines.push('', '### Last 10 Cycles');
      for (const entry of recent) {
        lines.push(`- Cycle ${entry.cycleId}: ${entry.result} (compliance: ${entry.metrics.protocolCompliance})`);
      }
    }

    const lastDecisions = index.decisionIndex.slice(-5);
    if (lastDecisions.length > 0) {
      lines.push('', '### Last 5 Decisions');
      for (const d of lastDecisions) {
        lines.push(`- Cycle ${d.cycle}: Option ${d.optionSelected} - ${d.title}`);
      }
    }

    lines.push('', '=== END BITACORA ===');
    return lines.join('\n');
  }

  async getRecentEntries(limit?: number): Promise<BitacoraCycleEntry[]> {
    return this.storage.getRecentBitacora(this.tenantId, this.projectId, limit ?? 15);
  }

  async getIndex(): Promise<BitacoraIndex> {
    return this.getOrCreateIndex();
  }

  async getFragment(fragmentId: string): Promise<string> {
    return this.storage.getBitacoraFragment(this.tenantId, this.projectId, fragmentId);
  }

  // ─── Private ─────────────────────────────────────────────────

  private async getOrCreateIndex(): Promise<BitacoraIndex> {
    if (this.index) return this.index;

    try {
      const stored = await this.storage.getBitacoraIndex(this.tenantId, this.projectId);
      if ('version' in stored && (stored as BitacoraIndex).version) {
        this.index = stored as BitacoraIndex;
        return this.index;
      }
    } catch {
      // No index yet
    }

    const defaultTomeId = 'tome-001';
    this.index = {
      version: '2.0',
      projectId: this.projectId,
      totalCycles: 0,
      currentTomeId: defaultTomeId,
      cyclesPerTome: CYCLES_PER_TOME,
      tomes: [{
        id: defaultTomeId, startCycle: 1, endCycle: null, cycleCount: 0,
        closed: false, createdAt: new Date().toISOString(),
      }],
      decisionIndex: [],
      metrics: {
        totalCycles: 0, successCount: 0, failureCount: 0, partialCount: 0,
        avgComplianceScore: 0, decisionCount: 0, optionDistribution: {},
      },
      lastUpdated: new Date().toISOString(),
    };
    return this.index;
  }
}

// ─── Pure helper ────────────────────────────────────────────────

function updateMetrics(current: BitacoraAggregateMetrics, entry: BitacoraCycleEntry): BitacoraAggregateMetrics {
  const total = current.totalCycles + 1;
  const successCount = current.successCount + (entry.result === 'SUCCESS' ? 1 : 0);
  const failureCount = current.failureCount + (entry.result === 'FAILURE' || entry.result === 'ERROR' ? 1 : 0);
  const partialCount = current.partialCount + (entry.result === 'PARTIAL' ? 1 : 0);

  const avgCompliance = current.totalCycles > 0
    ? (current.avgComplianceScore * current.totalCycles + entry.metrics.protocolCompliance) / total
    : entry.metrics.protocolCompliance;

  let decisionCount = current.decisionCount;
  const optionDistribution = { ...current.optionDistribution };
  if (entry.optionSelected) {
    decisionCount++;
    const opt = entry.optionSelected.option;
    optionDistribution[opt] = (optionDistribution[opt] ?? 0) + 1;
  }

  return {
    totalCycles: total,
    successCount,
    failureCount,
    partialCount,
    avgComplianceScore: Math.round(avgCompliance * 100) / 100,
    decisionCount,
    optionDistribution,
  };
}
