/**
 * CycleContextManager — Ring buffer of recent cycle snapshots.
 * Injected as "PREVIOUS CYCLE CONTEXT" in system prompt.
 * Ported from VSC_EXTENSION cycleContextManager.ts (DG-126 Phase 2A).
 */

// ─── Types ──────────────────────────────────────────────────────

export interface CycleSnapshot {
  readonly cycle: number;
  readonly timestamp: string;
  readonly requirementSummary: string;
  readonly responseSummary: string;
  readonly decisionGate?: {
    readonly detected: boolean;
    readonly options: Array<{ id: string; title: string }>;
    readonly selectedOption?: string;
    readonly selectedLabel?: string;
  };
  readonly enforcement?: {
    readonly score: number;
    readonly grade: string;
    readonly violations: number;
  };
}

// ─── Constants ─────────────────────────────────────────────────

const MAX_SNAPSHOTS = 5;
const MAX_REQUIREMENT_LENGTH = 500;
const MAX_RESPONSE_LENGTH = 5000;
const MAX_RESPONSE_IN_PROMPT = 2000;

// ─── Manager ───────────────────────────────────────────────────

export class CycleContextManager {
  private snapshots: CycleSnapshot[] = [];

  /** Capture state at end of a cycle */
  captureCycleState(snapshot: CycleSnapshot): void {
    const sanitized: CycleSnapshot = {
      ...snapshot,
      requirementSummary: snapshot.requirementSummary.substring(0, MAX_REQUIREMENT_LENGTH),
      responseSummary: snapshot.responseSummary.substring(0, MAX_RESPONSE_LENGTH),
    };
    this.snapshots.push(sanitized);
    this.snapshots = this.snapshots.slice(-MAX_SNAPSHOTS);
  }

  /** Get the last captured cycle */
  getLastCycle(): CycleSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  /** Update the decision selection on the last snapshot */
  updateLastDecisionSelection(selectedOption: string, selectedLabel: string): void {
    const last = this.snapshots[this.snapshots.length - 1];
    if (last?.decisionGate) {
      this.snapshots[this.snapshots.length - 1] = {
        ...last,
        decisionGate: {
          ...last.decisionGate,
          selectedOption,
          selectedLabel,
        },
      };
    }
  }

  /** Get all snapshots (for testing/debugging) */
  getSnapshots(): readonly CycleSnapshot[] {
    return this.snapshots;
  }

  /** Format cycle context for system prompt injection */
  getCycleContextForPrompt(): string {
    if (this.snapshots.length === 0) return '';

    const last = this.snapshots[this.snapshots.length - 1];
    if (!last) return '';

    const lines: string[] = [
      `=== PREVIOUS CYCLE CONTEXT (Cycle ${last.cycle}) ===`,
      '',
      '### USER REQUIREMENT',
      last.requirementSummary,
      '',
      '### ASSISTANT RESPONSE SUMMARY',
      last.responseSummary.substring(0, MAX_RESPONSE_IN_PROMPT),
    ];

    if (last.decisionGate?.detected) {
      lines.push('', '### DECISION STATE');
      for (const opt of last.decisionGate.options) {
        const marker = opt.id === last.decisionGate.selectedOption ? '-> ' : '   ';
        lines.push(`${marker}OPTION ${opt.id}: ${opt.title}`);
      }
      if (last.decisionGate.selectedOption) {
        lines.push(`User selected: Option ${last.decisionGate.selectedOption} (${last.decisionGate.selectedLabel ?? ''})`);
      }
    }

    if (last.enforcement) {
      lines.push('', '### ENFORCEMENT');
      lines.push(`Score: ${last.enforcement.score}/100, Grade: ${last.enforcement.grade}, Violations: ${last.enforcement.violations}`);
    }

    // Trend from last 3 cycles
    if (this.snapshots.length >= 2) {
      const trend = this.snapshots.slice(-3).map((s) =>
        `Cycle ${s.cycle}: ${s.enforcement?.grade ?? '?'} (${s.enforcement?.score ?? '?'})`,
      ).join(' -> ');
      lines.push('', `### TREND: ${trend}`);
    }

    lines.push('', '=== END PREVIOUS CYCLE CONTEXT ===');
    return lines.join('\n');
  }

  /** Reset all snapshots */
  reset(): void {
    this.snapshots = [];
  }
}
