/**
 * Protocol Engine — Motor 5 public API.
 */

export { ProtocolEngine } from './protocol-engine.js';
export { getInjectionMode } from './protocol-loader.js';
export { truncateToTokenBudget } from './prompt-builder.js';
export { isExecutionCommand } from './prompt-wrapper.js';
export { estimateTokenUsage, estimateTokens } from './token-estimator.js';
export {
  DEFAULT_TOKEN_BUDGETS,
  INJECTION_MODE_THRESHOLDS,
  SYSTEM_PROMPT_SECTIONS,
  DEFAULT_CACHE_TTL,
} from './constants.js';
export type {
  IProtocolEngine,
  ProtocolConfig,
  ProtocolContent,
  InjectionMode,
  SystemPromptContext,
  PromptWrapParams,
  TokenEstimate,
  TokenBudgets,
  IProtocolStorage,
} from './types.js';
