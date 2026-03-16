/**
 * Prompt Wrapper — wraps user prompts with [ENFORCE-SYNAPTIC-PROTOCOL] markers.
 */

import type { PromptWrapParams } from './types.js';

/**
 * Wrap a user prompt with enforcement markers and self-check checklist.
 */
export function wrapUserPrompt(params: PromptWrapParams): string {
  return [
    '[ENFORCE-SYNAPTIC-PROTOCOL]',
    `Cycle: ${params.cycle}`,
    `Mode: ${params.enforcementMode}`,
    `Loaded files: ${params.loadedFiles.join(', ')}`,
    '',
    'SELF-CHECK BEFORE RESPONDING:',
    '□ Response includes SYNAPTIC PROTOCOL v3.0 header',
    '□ SYSTEM STATE section present with Project, Cycle, Strength',
    '□ CONTEXT VERIFICATION section present',
    '□ REQUIREMENT ANALYSIS section present',
    '□ Decision Gate with 3 options (A/B/C) if architectural decision needed',
    '□ No code before Decision Gate approval',
    '□ AWAITING DECISION text present',
    '□ END OF RESPONSE marker present',
    '',
    'USER PROMPT:',
    params.userPrompt,
    '[/ENFORCE-SYNAPTIC-PROTOCOL]',
  ].join('\n');
}
