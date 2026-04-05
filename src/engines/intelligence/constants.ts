/**
 * Intelligence Engine constants — FULLY IMPLEMENTED.
 * Confidence system parameters, contradiction categories, and defaults.
 */

import type { ConfidenceSource, ContradictionCategory } from './types.js';

// ─── Confidence System Parameters ───────────────────────────────

/** Initial confidence score by source — aligned to VSC_EXTENSION battle-tested values (DG-126) */
export const INITIAL_CONFIDENCE: Record<ConfidenceSource, number> = {
  EXPLICIT: 0.6,    // was 0.9 — new learnings shouldn't look "certain" immediately
  REPEATED: 0.8,    // was 0.7
  INFERRED: 0.4,    // was 0.3 — prevents premature archival
};

/** Reinforcement increment per re-observation — flat 0.15, VSC proved per-source is unnecessary */
export const REINFORCEMENT_INCREMENT = 0.15;

/** Auto-promotion: INFERRED with 3+ observations and score >= 0.7 → REPEATED */
export const AUTO_PROMOTION_THRESHOLD = {
  minObservations: 3,
  minScore: 0.7,
};

/** Temporal decay parameters — aligned to VSC_EXTENSION (DG-126) */
export const DECAY_CONFIG = {
  gracePeriod: 20,       // Cycles without reinforcement before decay starts
  decayRate: 0.02,       // was 0.1 — CRITICAL FIX: 5x less aggressive (20 cycles to archive vs 4)
  archiveThreshold: 0.2,
};

/** Injection threshold — only learnings above this are injected into prompt */
export const INJECTION_THRESHOLD = 0.5;

/** Maximum learnings injected per prompt */
export const MAX_INJECTED_LEARNINGS = 10;

// ─── Bitacora Fragmentation ─────────────────────────────────────

export const BITACORA_CONFIG = {
  maxLinesPerFragment: 500,
  recentCyclesForPrompt: 15,
};

// ─── 9 Contradiction Categories (FULLY IMPLEMENTED) ─────────────

export const CONTRADICTION_CATEGORIES: ContradictionCategory[] = [
  {
    name: 'state-management',
    mutuallyExclusive: ['redux', 'zustand', 'mobx', 'jotai', 'recoil', 'valtio'],
  },
  {
    name: 'styling',
    mutuallyExclusive: ['tailwind', 'styled-components', 'css-modules', 'emotion', 'sass'],
  },
  {
    name: 'testing',
    mutuallyExclusive: ['jest', 'vitest', 'mocha', 'cypress', 'playwright'],
  },
  {
    name: 'package-manager',
    mutuallyExclusive: ['npm', 'yarn', 'pnpm', 'bun'],
  },
  {
    name: 'framework',
    mutuallyExclusive: ['next', 'remix', 'gatsby', 'nuxt', 'sveltekit'],
  },
  {
    name: 'database',
    mutuallyExclusive: ['postgresql', 'mysql', 'mongodb', 'sqlite', 'dynamodb'],
  },
  {
    name: 'orm',
    mutuallyExclusive: ['prisma', 'drizzle', 'typeorm', 'sequelize', 'mongoose'],
  },
  {
    name: 'bundler',
    mutuallyExclusive: ['webpack', 'vite', 'esbuild', 'turbopack', 'rollup'],
  },
  {
    name: 'runtime',
    mutuallyExclusive: ['node', 'deno', 'bun'],
  },
];

// ─── Default Intelligence Config ────────────────────────────────

export const DEFAULT_INTELLIGENCE_CONFIG = {
  confidence: {
    injectionThreshold: INJECTION_THRESHOLD,
    gracePeriod: DECAY_CONFIG.gracePeriod,
    decayRate: DECAY_CONFIG.decayRate,
    archiveThreshold: DECAY_CONFIG.archiveThreshold,
    maxInjected: MAX_INJECTED_LEARNINGS,
  },
  bitacora: {
    maxLinesPerFragment: BITACORA_CONFIG.maxLinesPerFragment,
    recentCyclesForPrompt: BITACORA_CONFIG.recentCyclesForPrompt,
  },
  contradictionCategories: CONTRADICTION_CATEGORIES,
} as const;
