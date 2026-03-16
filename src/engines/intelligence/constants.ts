/**
 * Intelligence Engine constants — FULLY IMPLEMENTED.
 * Confidence system parameters, contradiction categories, and defaults.
 */

import type { ConfidenceSource, ContradictionCategory } from './types.js';

// ─── Confidence System Parameters ───────────────────────────────

/** Initial confidence score by source */
export const INITIAL_CONFIDENCE: Record<ConfidenceSource, number> = {
  EXPLICIT: 0.9,
  REPEATED: 0.7,
  INFERRED: 0.3,
};

/** Reinforcement increment per re-observation */
export const REINFORCEMENT_INCREMENT: Record<ConfidenceSource, number> = {
  EXPLICIT: 0.05,
  REPEATED: 0.10,
  INFERRED: 0.15,
};

/** Auto-promotion: INFERRED with 3+ observations and score >= 0.7 → REPEATED */
export const AUTO_PROMOTION_THRESHOLD = {
  minObservations: 3,
  minScore: 0.7,
};

/** Temporal decay parameters */
export const DECAY_CONFIG = {
  gracePeriod: 20,      // Cycles without reinforcement before decay starts
  decayRate: 0.1,       // Score decrease per cycle after grace period
  archiveThreshold: 0.2, // Below this score → learning is archived
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
