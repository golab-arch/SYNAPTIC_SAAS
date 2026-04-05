/**
 * D4 Cascade — Decision Gate selection detector (steps 1-3).
 * Ported from VSC_EXTENSION chatWebviewProvider.ts (DG-126 Phase 2B).
 * Step 4 (LLM micro-call) deferred to Phase 4.
 */

export interface DGOption {
  id: string;
  title: string;
}

/**
 * Parse Decision Gate options from an LLM response.
 * Tolerant regex supporting English + Spanish + multiple markdown formats.
 */
export function parseDecisionGateFromResponse(text: string): {
  detected: boolean;
  options: DGOption[];
} {
  const options: DGOption[] = [];

  // English: "OPTION A: ...", "**OPTION B**: ...", "#### OPTION C: ..."
  const enPattern = /(?:#{1,4}\s*)?(?:\*{0,2})OPTION\s+([ABC])(?:\*{0,2})[:\s\u2014\u2013-]+(.+?)(?:\n|$)/gi;
  let match;
  while ((match = enPattern.exec(text)) !== null) {
    const id = match[1]!.toUpperCase();
    if (!options.find((o) => o.id === id)) {
      options.push({ id, title: match[2]!.trim() });
    }
  }

  // Fallback: Spanish "Opción A: ..."
  if (options.length < 2) {
    const esPattern = /(?:#{1,4}\s*)?(?:\*{0,2})Opci[o\u00f3]n\s+([ABC])(?:\*{0,2})[:\s\u2014\u2013-]+(.+?)(?:\n|$)/gi;
    while ((match = esPattern.exec(text)) !== null) {
      const id = match[1]!.toUpperCase();
      if (!options.find((o) => o.id === id)) {
        options.push({ id, title: match[2]!.trim() });
      }
    }
  }

  return { detected: options.length >= 2, options };
}

/**
 * D4 Cascade: detect which DG option the user selected.
 * Steps 1-3 only (regex, zero cost). Returns null if no detection.
 */
export function detectDGSelection(
  userPrompt: string,
  previousOptions: DGOption[],
): string | null {
  const prompt = userPrompt.trim();

  // ── Step 1: Direct letter regex ──
  const directPatterns = [
    /\b(?:opci[o\u00f3]n|option)\s*([ABC])\b/i,
    /\bproceed\s+with\s+(?:option\s+)?([ABC])\b/i,
    /\b([ABC])\)\s/i,
  ];
  for (const pattern of directPatterns) {
    const m = pattern.exec(prompt);
    if (m) return m[1]!.toUpperCase();
  }

  // ── Step 2: Ordinal/positional ──
  const ordinalMap: Record<string, string> = {
    primera: 'A', primer: 'A', first: 'A', 'first option': 'A',
    segunda: 'B', segundo: 'B', second: 'B', 'second option': 'B',
    'del medio': 'B', middle: 'B',
    tercera: 'C', tercer: 'C', third: 'C', 'third option': 'C',
    '\u00faltima': 'C', last: 'C',
  };
  const lower = prompt.toLowerCase();
  for (const [keyword, option] of Object.entries(ordinalMap)) {
    if (lower.includes(keyword)) return option;
  }

  // ── Step 3: Keyword match vs DG option titles (Jaccard >= 40%) ──
  if (previousOptions.length > 0) {
    const promptWords = new Set(lower.split(/\s+/).filter((w) => w.length > 2));
    if (promptWords.size >= 2) {
      let bestOption: string | null = null;
      let bestScore = 0;

      for (const opt of previousOptions) {
        const titleWords = new Set(
          opt.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
        );
        if (titleWords.size === 0) continue;
        let overlap = 0;
        for (const w of promptWords) {
          if (titleWords.has(w)) overlap++;
        }
        const score = overlap / titleWords.size;
        if (score >= 0.4 && score > bestScore) {
          bestScore = score;
          bestOption = opt.id;
        }
      }
      if (bestOption) return bestOption;
    }
  }

  // Step 4 (LLM micro-call) — implemented in detectDGSelectionAsync
  return null;
}

// ─── D4 Step 4: LLM Micro-Call (DG-126 Phase 4) ────────────────

/** Cheapest model per provider for micro-calls (~$0.0004 per call) */
export const MICRO_CALL_MODELS: Record<string, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
};

export function getMicroCallModel(providerId: string): string {
  return MICRO_CALL_MODELS[providerId] ?? 'gpt-4o-mini';
}

/**
 * D4 Cascade with Step 4 (LLM micro-call).
 * Steps 1-3 are synchronous regex. Step 4 calls the LLM with 3s timeout.
 */
export async function detectDGSelectionAsync(
  userPrompt: string,
  previousOptions: DGOption[],
  llmCall: ((prompt: string) => Promise<string | null>) | null,
): Promise<string | null> {
  // Steps 1-3
  const regexResult = detectDGSelection(userPrompt, previousOptions);
  if (regexResult) return regexResult;

  // Step 4: LLM micro-call
  if (!llmCall || previousOptions.length < 2) return null;

  try {
    const optionList = previousOptions.map((o) => `${o.id}: ${o.title}`).join('\n');
    const microPrompt = `Previous Decision Gate options:\n${optionList}\n\nUser's response: "${userPrompt.substring(0, 200)}"\n\nWhich option did the user select? Reply ONLY with A, B, or C. If unclear, reply NONE.`;

    const response = await Promise.race([
      llmCall(microPrompt),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

    if (response) {
      const letterMatch = response.match(/\b([ABC])\b/);
      if (letterMatch) return letterMatch[1]!;
    }
  } catch {
    // Step 4 failed
  }

  return null;
}
