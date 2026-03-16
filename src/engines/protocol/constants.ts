/**
 * Protocol Engine constants — FULLY IMPLEMENTED.
 * Token budgets, injection modes, and defaults.
 */

import type { TokenBudgets, ProtocolConfig } from './types.js';

// ─── Token Budgets ──────────────────────────────────────────────

export const DEFAULT_TOKEN_BUDGETS: TokenBudgets = {
  masterProtocol: {
    full: 7300,      // Cycle 1: complete protocol
    partial: 4500,   // Cycles 2-5: core + partial extended
    coreOnly: 2800,  // Cycles 6+: core only
  },
  directorFiles: {
    rules: 2000,
    designDoc: 1500,
    mantra: 500,
  },
  intelligence: {
    decisions: 600,
    learnings: 400,
  },
  bitacora: 800,
  language: 200,
  covenant: 500,
};

// ─── Cycle-aware Injection Thresholds ───────────────────────────

export const INJECTION_MODE_THRESHOLDS = {
  FULL_MAX_CYCLE: 1,       // FULL mode for cycle 1 only
  PARTIAL_MAX_CYCLE: 5,    // PARTIAL mode for cycles 2-5
  // Cycles 6+: CORE_ONLY
} as const;

// ─── System Prompt Section Order ────────────────────────────────

export const SYSTEM_PROMPT_SECTIONS = [
  'MASTER_PROTOCOL',     // SYNAPTIC_CORE + EXTENDED (cycle-aware)
  'DIRECTOR_FILES',      // MANTRA + RULES + DESIGN_DOC
  'INTELLIGENCE_SUMMARY', // Decisions + Learnings (confidence >= 0.5)
  'BITACORA_HISTORY',    // Last 15 cycles summarized
  'LANGUAGE_DIRECTIVE',  // Only if non-English
  'MODE_COVENANT',       // Hardcoded covenant
] as const;

// ─── Cache ──────────────────────────────────────────────────────

export const DEFAULT_CACHE_TTL = 60_000; // 60 seconds

// ─── Default Config ─────────────────────────────────────────────

export const DEFAULT_PROTOCOL_CONFIG: Omit<ProtocolConfig, 'coreProtocol' | 'covenant'> = {
  protocolVersion: '3.0',
  tokenBudgets: DEFAULT_TOKEN_BUDGETS,
  cacheTTL: DEFAULT_CACHE_TTL,
};
