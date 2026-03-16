/**
 * Protocol Loader — loads and returns protocol content based on cycle.
 * 3 injection modes: FULL (cycle 1), PARTIAL (2-5), CORE_ONLY (6+).
 */

import type { InjectionMode, ProtocolContent } from './types.js';
import { INJECTION_MODE_THRESHOLDS } from './constants.js';

/**
 * Determine injection mode based on current cycle.
 */
export function getInjectionMode(cycle: number): InjectionMode {
  if (cycle <= INJECTION_MODE_THRESHOLDS.FULL_MAX_CYCLE) return 'FULL';
  if (cycle <= INJECTION_MODE_THRESHOLDS.PARTIAL_MAX_CYCLE) return 'PARTIAL';
  return 'CORE_ONLY';
}

/**
 * Load protocol content based on injection mode.
 */
export function loadProtocolContent(
  coreProtocol: string,
  extendedProtocol: string | undefined,
  mode: InjectionMode,
): ProtocolContent {
  switch (mode) {
    case 'FULL': {
      const content = extendedProtocol
        ? `${coreProtocol}\n\n${extendedProtocol}`
        : coreProtocol;
      return { mode, content, tokenCount: estimateTokens(content) };
    }
    case 'PARTIAL': {
      // Include core + first half of extended
      const partialExtended = extendedProtocol
        ? extendedProtocol.substring(0, Math.floor(extendedProtocol.length / 2))
        : '';
      const content = partialExtended
        ? `${coreProtocol}\n\n${partialExtended}\n[... partial protocol injection]`
        : coreProtocol;
      return { mode, content, tokenCount: estimateTokens(content) };
    }
    case 'CORE_ONLY':
      return { mode, content: coreProtocol, tokenCount: estimateTokens(coreProtocol) };
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
