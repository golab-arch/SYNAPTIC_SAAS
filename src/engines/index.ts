/**
 * SYNAPTIC 5 Engines — unified public API.
 */

// Motor 1: Enforcement
export { EnforcementEngine } from './enforcement/index.js';
export type { IEnforcementEngine, EnforcementConfig } from './enforcement/index.js';

// Motor 2: SAI
export { SAIEngine } from './sai/index.js';
export type { ISAIEngine, SAIConfig } from './sai/index.js';

// Motor 3: Intelligence
export { IntelligenceEngine } from './intelligence/index.js';
export type { IIntelligenceEngine, IntelligenceConfig } from './intelligence/index.js';

// Motor 4: Guidance
export { GuidanceEngine } from './guidance/index.js';
export type { IGuidanceEngine, GuidanceConfig } from './guidance/index.js';

// Motor 5: Protocol
export { ProtocolEngine } from './protocol/index.js';
export type { IProtocolEngine, ProtocolConfig } from './protocol/index.js';

// Shared types
export type { IEngine, TenantScope, Severity, Grade, Trend } from './types.js';
