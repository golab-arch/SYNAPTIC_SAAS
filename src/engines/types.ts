/**
 * Shared types across all 5 SYNAPTIC engines.
 */

/** Base interface for all engines */
export interface IEngine {
  initialize(config: unknown): Promise<void>;
  dispose(): Promise<void>;
}

/** Multi-tenancy scope — all storage operations are scoped by this */
export interface TenantScope {
  readonly tenantId: string;
  readonly projectId: string;
}

/** Severity levels shared across engines */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/** Grade scale shared across engines */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/** Trend analysis direction */
export type Trend = 'IMPROVING' | 'STABLE' | 'DECLINING';
