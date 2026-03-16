/**
 * Storage Abstraction Layer — all I*Storage interfaces.
 * Re-exports storage interfaces from each engine for convenience.
 */

export type { ISAIStorage } from '../engines/sai/types.js';
export type { IIntelligenceStorage } from '../engines/intelligence/types.js';
export type { IGuidanceStorage } from '../engines/guidance/types.js';
export type { IProtocolStorage } from '../engines/protocol/types.js';

// Enforcement storage is defined here (not in engine types) because
// the engine's types don't include it inline.

import type { ComplianceHistoryEntry, Violation } from '../engines/enforcement/types.js';

export interface IEnforcementStorage {
  saveComplianceEntry(
    tenantId: string,
    projectId: string,
    entry: ComplianceHistoryEntry,
  ): Promise<void>;
  getComplianceHistory(
    tenantId: string,
    projectId: string,
    limit?: number,
  ): Promise<ComplianceHistoryEntry[]>;
  saveViolations(
    tenantId: string,
    projectId: string,
    cycle: number,
    violations: Violation[],
  ): Promise<void>;
}
