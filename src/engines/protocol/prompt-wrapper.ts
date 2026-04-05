/**
 * Prompt Wrapper — wraps user prompts with [ENFORCE-SYNAPTIC-PROTOCOL] markers.
 * DG-126 Phase 4: execution detection + mode-aware wrapping.
 */

import type { PromptWrapParams } from './types.js';

/**
 * DG-126 Phase 4: Detect execution commands in user prompt.
 * When true, system prompt switches to "EXECUTE NOW" mode (skip Decision Gates).
 */
export function isExecutionCommand(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const patterns = [
    /\b(ejecuta|implementa|crea|genera|hazlo|procede|aplica)\b/,
    /\b(execute|implement|create|generate|do it|proceed|apply|build|make)\b/,
    /\bopci[o\u00f3]n\s*[abc]\b/i,
    /\boption\s*[abc]\b/i,
    /\bproceed\s+with\s+(option\s+)?[abc]\b/i,
    /\bahora\b/,
    /\bnow\b/,
  ];
  return patterns.some((p) => p.test(lower));
}

/**
 * Wrap a user prompt with enforcement markers and self-check checklist.
 */
export function wrapUserPrompt(params: PromptWrapParams): string {
  const isExecution = isExecutionCommand(params.userPrompt);

  const checklist = isExecution
    ? [
        'IMMEDIATE EXECUTION MODE: Skip Decision Gates.',
        'EXECUTE the request directly using available tools (Write, Edit, Read, Glob, Grep, Bash).',
        'Do NOT just describe or plan — actually INVOKE the tools.',
        'ACT IMMEDIATELY on the user\'s request.',
      ]
    : [
        '\u25A1 Response includes SYNAPTIC PROTOCOL v3.0 header',
        '\u25A1 SYSTEM STATE section present with Project, Cycle, Strength',
        '\u25A1 CONTEXT VERIFICATION section present',
        '\u25A1 REQUIREMENT ANALYSIS section present',
        '\u25A1 Decision Gate with 3 options (A/B/C) if architectural decision needed',
        '\u25A1 No code before Decision Gate approval',
        '\u25A1 AWAITING DECISION text present',
        '\u25A1 END OF RESPONSE marker present',
      ];

  return [
    '[ENFORCE-SYNAPTIC-PROTOCOL]',
    `Cycle: ${params.cycle}`,
    `Mode: ${params.enforcementMode}`,
    `Loaded files: ${params.loadedFiles.join(', ')}`,
    '',
    isExecution ? 'EXECUTION DIRECTIVE:' : 'SELF-CHECK BEFORE RESPONDING:',
    ...checklist,
    '',
    'USER PROMPT:',
    params.userPrompt,
    '[/ENFORCE-SYNAPTIC-PROTOCOL]',
  ].join('\n');
}
