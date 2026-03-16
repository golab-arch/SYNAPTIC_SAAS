/**
 * Token Estimator — estimates token usage per section of the system prompt.
 */

// TODO: Implement

import type { TokenEstimate, TokenBudgets, InjectionMode } from './types.js';

/** Approximate characters per token */
const CHARS_PER_TOKEN = 4;

/**
 * Estimate total token usage for a given cycle.
 */
export function estimateTokenUsage(
  mode: InjectionMode,
  budgets: TokenBudgets,
  contextWindowSize: number,
): TokenEstimate {
  const protocol = budgets.masterProtocol[
    mode === 'FULL' ? 'full' : mode === 'PARTIAL' ? 'partial' : 'coreOnly'
  ];
  const directorFiles =
    budgets.directorFiles.rules +
    budgets.directorFiles.designDoc +
    budgets.directorFiles.mantra;
  const intelligence = budgets.intelligence.decisions + budgets.intelligence.learnings;
  const bitacora = budgets.bitacora;
  const total = protocol + directorFiles + intelligence + bitacora + budgets.language + budgets.covenant;

  return {
    protocol,
    directorFiles,
    intelligence,
    bitacora,
    total,
    remainingForUser: contextWindowSize - total,
  };
}

/**
 * Estimate token count from text content.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
