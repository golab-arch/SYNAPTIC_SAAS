/**
 * S4 Semantic Learning Enrichment — LLM-powered learning evolution.
 * Ported from VSC_EXTENSION learningService.ts (DG-126 Phase 4).
 * Runs every 5 cycles. Uses cheapest model. 10s timeout. Non-blocking.
 */

import type { LearningEntry, ConfidenceSource } from './types.js';
import { INITIAL_CONFIDENCE } from './constants.js';

const ENRICHMENT_INTERVAL = 5;
const MAX_LEARNINGS_IN_PROMPT = 10;
const S4_TIMEOUT = 10_000;

interface S4Action {
  action: 'enrich' | 'merge' | 'new';
  index?: number;
  indices?: number[];
  title: string;
  description: string;
}

export function shouldRunEnrichment(cycle: number): boolean {
  return cycle > 0 && cycle % ENRICHMENT_INTERVAL === 0;
}

export function buildS4Prompt(learnings: LearningEntry[], cycleSummaries: string[]): string {
  const learningLines = learnings.slice(0, MAX_LEARNINGS_IN_PROMPT).map((l, i) =>
    `${i + 1}. [${l.category}] "${l.content}" (${Math.round(l.confidence.score * 100)}%)`,
  ).join('\n');

  const summaryLines = cycleSummaries.slice(-5).join('\n---\n');

  return `You are analyzing a software project's accumulated learnings to make them more actionable.

Current learnings:
${learningLines}

Recent cycle summaries:
${summaryLines}

Your task:
1. ENRICH: For any learning with a generic description, rewrite it with specific guidance (ALWAYS/NEVER/PREFER directives).
2. MERGE: If two learnings express the same preference, combine them.
3. NEW: If you see a pattern not captured by any learning, create one.

Rules:
- Each description must contain at least one directive verb (ALWAYS, NEVER, PREFER, AVOID, USE, DO NOT)
- Be specific to THIS project, not generic advice
- Maximum 3 actions total

Respond ONLY with a JSON array:
[{"action":"enrich","index":0,"title":"...","description":"..."},{"action":"merge","indices":[1,3],"title":"...","description":"..."},{"action":"new","title":"...","description":"..."}]

If no improvements needed: []`;
}

export function applyS4Actions(
  actions: S4Action[],
  learnings: LearningEntry[],
  currentCycle: number,
): { modified: LearningEntry[]; newLearnings: LearningEntry[] } {
  const modified = [...learnings];
  const newLearnings: LearningEntry[] = [];
  const now = new Date().toISOString();

  for (const action of actions.slice(0, 3)) {
    if (action.action === 'enrich' && action.index != null && modified[action.index]) {
      const target = modified[action.index]!;
      modified[action.index] = {
        ...target,
        content: action.description || target.content,
        confidence: { ...target.confidence, score: Math.min(1.0, target.confidence.score + 0.05) },
      };
    } else if (action.action === 'merge' && action.indices?.length) {
      const indices = action.indices.filter((i) => i < modified.length);
      if (indices.length < 2) continue;
      const sorted = indices.sort((a, b) => modified[b]!.confidence.score - modified[a]!.confidence.score);
      const primary = modified[sorted[0]!]!;
      modified[sorted[0]!] = {
        ...primary,
        content: action.description || primary.content,
        confidence: { ...primary.confidence, score: Math.min(1.0, primary.confidence.score + 0.1), evidenceCount: primary.confidence.evidenceCount + 1 },
      };
      for (const idx of sorted.slice(1)) {
        (modified as Array<LearningEntry | null>)[idx] = null;
      }
    } else if (action.action === 'new' && action.title) {
      newLearnings.push({
        id: `s4-insight-${currentCycle}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        content: `${action.title}: ${action.description}`,
        category: 'insight',
        confidence: {
          score: INITIAL_CONFIDENCE.INFERRED,
          source: 'INFERRED' as ConfidenceSource,
          evidenceCount: 1,
          lastReinforced: now,
          lastReinforcedCycle: currentCycle,
        },
        createdAt: now,
        createdInCycle: currentCycle,
      });
    }
  }

  return {
    modified: modified.filter(Boolean) as LearningEntry[],
    newLearnings,
  };
}

export async function runS4Enrichment(
  learnings: LearningEntry[],
  cycleSummaries: string[],
  currentCycle: number,
  llmCall: (prompt: string) => Promise<string | null>,
): Promise<{ modified: LearningEntry[]; newLearnings: LearningEntry[] }> {
  if (learnings.length === 0) return { modified: learnings, newLearnings: [] };

  const prompt = buildS4Prompt(learnings, cycleSummaries);

  const response = await Promise.race([
    llmCall(prompt),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), S4_TIMEOUT)),
  ]);

  if (!response) return { modified: learnings, newLearnings: [] };

  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return { modified: learnings, newLearnings: [] };

  try {
    const actions = JSON.parse(jsonMatch[0]) as S4Action[];
    if (!Array.isArray(actions)) return { modified: learnings, newLearnings: [] };
    return applyS4Actions(actions, learnings, currentCycle);
  } catch {
    return { modified: learnings, newLearnings: [] };
  }
}
