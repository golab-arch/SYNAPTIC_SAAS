/**
 * Prompt Builder — constructs the complete system prompt from 6 sections.
 */

import type { SystemPromptContext, TokenBudgets } from './types.js';

/**
 * Build the complete system prompt by concatenating 6 sections.
 */
export function buildSystemPrompt(
  context: SystemPromptContext,
  protocolContent: string,
  covenant: string,
  budgets: TokenBudgets,
): string {
  const sections: string[] = [];

  // Section 1: Master Protocol (cycle-aware content)
  sections.push(protocolContent);

  // Section 2: Director Files (truncated per budget)
  const directorSection = [
    '## DIRECTOR FILES',
    '',
    '### MANTRA',
    truncateToTokenBudget(context.directorFiles.mantra, budgets.directorFiles.mantra),
    '',
    '### RULES',
    truncateToTokenBudget(context.directorFiles.rules, budgets.directorFiles.rules),
    '',
    '### DESIGN_DOC',
    truncateToTokenBudget(context.directorFiles.designDoc, budgets.directorFiles.designDoc),
  ].join('\n');
  sections.push(directorSection);

  // Section 3: Intelligence Summary
  const { intelligenceSummary } = context;
  if (intelligenceSummary.recentDecisions.length > 0 || intelligenceSummary.topLearnings.length > 0) {
    const intellSection = [
      '## INTELLIGENCE CONTEXT',
      '',
      `Current Cycle: ${intelligenceSummary.currentCycle}`,
      `Synaptic Strength: ${intelligenceSummary.synapticStrength}%`,
    ];

    if (intelligenceSummary.recentDecisions.length > 0) {
      intellSection.push('', '### Recent Decisions');
      for (const d of intelligenceSummary.recentDecisions.slice(0, 10)) {
        intellSection.push(`- ${d.decisionId}: ${d.decisionPoint} → Option ${d.selectedOption}`);
      }
    }

    if (intelligenceSummary.topLearnings.length > 0) {
      intellSection.push('', '### Key Learnings');
      for (const l of intelligenceSummary.topLearnings.slice(0, 5)) {
        intellSection.push(`- [${l.confidence.score.toFixed(1)}] ${l.content}`);
      }
    }

    sections.push(truncateToTokenBudget(
      intellSection.join('\n'),
      budgets.intelligence.decisions + budgets.intelligence.learnings,
    ));
  }

  // Section 3.5: Previous Cycle Context (DG-126 Phase 2A)
  if (context.previousCycleContext) {
    sections.push(context.previousCycleContext);
  }

  // Section 4: Bitacora History
  if (context.bitacoraHistory) {
    sections.push(truncateToTokenBudget(
      `## RECENT BITACORA\n\n${context.bitacoraHistory}`,
      budgets.bitacora,
    ));
  }

  // Section 5: Language Directive
  if (context.userLanguage && context.userLanguage !== 'en') {
    sections.push(
      `## LANGUAGE\nRespond in ${context.userLanguage}. All technical terms may remain in English.`,
    );
  }

  // Section 6: Covenant
  sections.push(truncateToTokenBudget(covenant, budgets.covenant));

  return sections.join('\n\n---\n\n');
}

/**
 * Truncate text to approximate token budget.
 * Rough estimate: 1 token ≈ 4 characters.
 */
export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '\n[... truncated to fit token budget]';
}
