/**
 * AgentLoopService — the heart of SYNAPTIC_SAAS.
 * Orchestrates the 5 engines + LLM in the 9-step execution flow.
 * Contains NO business logic — only orchestration.
 */

import type { ILLMProvider, LLMMessage } from '../providers/types.js';
import { ProviderError, classifyProviderError } from '../providers/types.js';
import { createProvider } from '../providers/provider-factory.js';
import type { IEnforcementEngine } from '../engines/enforcement/types.js';
import type { ISAIEngine, FileContent } from '../engines/sai/types.js';
import type { IIntelligenceEngine, BitacoraCycleEntry, LearningEntry } from '../engines/intelligence/types.js';
import type { IGuidanceEngine } from '../engines/guidance/types.js';
import type { IProtocolEngine } from '../engines/protocol/types.js';
import type { ToolExecutor } from '../tools/tool-executor.js';
import { GRADUATED_ENFORCEMENT, getEnforcementLevelForCycle } from '../engines/enforcement/constants.js';
import { CycleContextManager } from '../engines/intelligence/cycle-context-manager.js';
import { detectInferredLearnings, type ToolActionSummary } from '../engines/intelligence/learning-detectors.js';
import { detectDGSelection, parseDecisionGateFromResponse } from '../engines/intelligence/dg-selection-detector.js';
import type { OrchestrationRequest, SSEEvent } from './types.js';

export interface AgentLoopConfig {
  readonly maxRegenerationAttempts: number;
  readonly decayStartCycle: number;
}

const DEFAULT_CONFIG: AgentLoopConfig = {
  maxRegenerationAttempts: 5,
  decayStartCycle: 25,
};

export class AgentLoopService {
  private readonly config: AgentLoopConfig;

  private readonly cycleContextManager: CycleContextManager;

  constructor(
    private readonly protocolEngine: IProtocolEngine,
    private readonly intelligenceEngine: IIntelligenceEngine,
    private readonly enforcementEngine: IEnforcementEngine,
    private readonly saiEngine: ISAIEngine,
    private readonly guidanceEngine: IGuidanceEngine,
    private readonly llmProvider: ILLMProvider,
    private readonly toolExecutor?: ToolExecutor,
    cycleContextManager?: CycleContextManager,
    config?: Partial<AgentLoopConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cycleContextManager = cycleContextManager ?? new CycleContextManager();
  }

  /**
   * Execute the full 9-step orchestration loop.
   */
  async *execute(request: OrchestrationRequest): AsyncGenerator<SSEEvent> {
    const startTime = Date.now();

    // BYOK: create per-request provider if apiKey provided, else fall back to default
    let llm: ILLMProvider = this.llmProvider;
    if (request.provider.apiKey) {
      try {
        llm = createProvider(request.provider.providerId, request.provider.apiKey);
      } catch {
        // Unknown provider — fall back to injected default (e.g. mock in tests)
      }
    }

    // DG-126: flags for user protection (Item 4)
    let hadProviderError = false;
    let enforcementGradeF = false;

    try {
      // ── STEP 1: Tentative cycle (committed in STEP 8 only on success) ──
      const tentativeCycle = await this.intelligenceEngine.peekNextCycle();
      yield { event: 'message', data: { step: 'cycle', cycle: tentativeCycle } };

      // ── STEP 2: Pre-cycle maintenance (learning decay) ──
      if (tentativeCycle >= this.config.decayStartCycle) {
        const archived = await this.intelligenceEngine.applyDecay(tentativeCycle);
        if (archived > 0) {
          yield { event: 'message', data: { step: 'decay', archived } };
        }
      }

      // ── STEP 3: Build system prompt (Protocol + Intelligence + Director files) ──
      const intelligenceSummary = await this.intelligenceEngine.getIntelligenceSummary();
      const recentBitacora = await this.intelligenceEngine.getRecentBitacora(15);
      const bitacoraHistory = formatBitacoraForPrompt(recentBitacora);

      // Load director files from context documents
      const contextDocs = await this.intelligenceEngine.getContextDocuments();
      const directorFiles = extractDirectorFiles(contextDocs);

      const systemPrompt = await this.protocolEngine.buildSystemPrompt({
        cycle: tentativeCycle,
        mode: 'SYNAPTIC',
        directorFiles,
        intelligenceSummary,
        bitacoraHistory,
        userLanguage: 'es',
        modelId: request.provider.model,
        previousCycleContext: this.cycleContextManager.getCycleContextForPrompt(),
      });

      // ── STEP 4: Wrap user prompt with enforcement markers ──
      const loadedFiles = Object.entries(directorFiles)
        .filter(([, v]) => v.length > 0)
        .map(([k]) => k.toUpperCase());
      if (intelligenceSummary.topLearnings.length > 0) loadedFiles.push('INTELLIGENCE');

      const wrappedPrompt = this.protocolEngine.wrapUserPrompt({
        userPrompt: request.prompt,
        cycle: tentativeCycle,
        loadedFiles,
        enforcementMode: 'STRICT',
      });

      // ── STEP 5: LLM interaction with tool use loop ──
      let fullResponse = '';
      const messages: LLMMessage[] = [
        ...request.messages,
        { role: 'user' as const, content: wrappedPrompt },
      ];
      const toolDefs = this.toolExecutor?.getToolDefinitions() ?? [];
      const maxToolRounds = 20;
      const toolActions: ToolActionSummary[] = [];  // DG-126 Phase 2B: collect for learning extraction

      for (let toolRound = 0; toolRound < maxToolRounds; toolRound++) {
        let currentToolId: string | undefined;
        let currentToolName: string | undefined;
        let toolInputJson = '';
        const pendingToolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

        for await (const chunk of llm.streamMessage({
          model: request.provider.model,
          messages,
          systemPrompt,
          tools: toolDefs,
          maxTokens: 4096,
        })) {
          if (chunk.type === 'text' && chunk.content) {
            fullResponse += chunk.content;
            yield { event: 'message', data: { text: chunk.content } };
          } else if (chunk.type === 'tool_use_start') {
            // Finalize previous tool call if any
            if (currentToolName && currentToolId) {
              try {
                pendingToolCalls.push({ id: currentToolId, name: currentToolName, input: JSON.parse(toolInputJson || '{}') as Record<string, unknown> });
              } catch { /* skip malformed */ }
            }
            currentToolId = chunk.toolCall?.id;
            currentToolName = chunk.toolCall?.name;
            toolInputJson = '';
            yield { event: 'tool_use', data: chunk.toolCall };
          } else if (chunk.type === 'tool_use_input') {
            toolInputJson += chunk.content ?? '';
          } else if (chunk.type === 'done') {
            // Finalize last tool call
            if (currentToolName && currentToolId) {
              try {
                pendingToolCalls.push({ id: currentToolId, name: currentToolName, input: JSON.parse(toolInputJson || '{}') as Record<string, unknown> });
              } catch { /* skip */ }
            }
            yield { event: 'message', data: { step: 'llm_done', usage: chunk.usage } };
          }
        }

        // If no tool calls, LLM loop is done
        if (pendingToolCalls.length === 0 || !this.toolExecutor) break;

        // Execute tool calls and feed results back to LLM
        messages.push({ role: 'assistant' as const, content: fullResponse });
        fullResponse = '';

        for (const tc of pendingToolCalls) {
          const result = await this.toolExecutor.execute({ id: tc.id, name: tc.name, input: tc.input });
          yield { event: 'tool_result', data: { tool: tc.name, output: result.output.substring(0, 5000), isError: result.isError } };
          messages.push({ role: 'user' as const, content: `[Tool result for ${tc.name}]: ${result.output.substring(0, 10000)}` });

          // DG-126 Phase 2B: Collect tool data for learning extraction
          if (!result.isError) {
            toolActions.push({
              toolName: tc.name,
              inputPreview: JSON.stringify(tc.input).substring(0, 200),
              filePaths: extractFilePathsFromInput(tc.input),
            });
          }
        }
      }

      // ── STEP 6: Graduated enforcement validation (DG-126 Item 2) ──
      const enforcementLevel = getEnforcementLevelForCycle(tentativeCycle);
      let validationResult = this.enforcementEngine.validate(fullResponse);
      let attempts = 1;

      if (enforcementLevel === 'informational') {
        // Cycles 1-5: validate but don't regenerate
        yield {
          event: 'message',
          data: { step: 'enforcement', mode: 'informational', score: validationResult.score, grade: validationResult.grade },
        };
      } else {
        // Cycles 6+: graduated regeneration
        const threshold = enforcementLevel === 'soft'
          ? GRADUATED_ENFORCEMENT.SOFT_THRESHOLD
          : GRADUATED_ENFORCEMENT.STANDARD_THRESHOLD;
        const maxRetries = enforcementLevel === 'soft'
          ? GRADUATED_ENFORCEMENT.SOFT_MAX_RETRIES
          : GRADUATED_ENFORCEMENT.STANDARD_MAX_RETRIES;

        while (validationResult.score < threshold && attempts <= maxRetries) {
          yield {
            event: 'regeneration',
            data: { attempt: attempts, maxRetries, score: validationResult.score, violations: validationResult.violations.length, mode: enforcementLevel },
          };

          const feedback = this.enforcementEngine.buildRegenerationMessage(
            validationResult.violations, attempts, maxRetries,
          );

          const regenResponse = await llm.sendMessage({
            model: request.provider.model,
            messages: [...messages, { role: 'assistant' as const, content: fullResponse }, { role: 'user' as const, content: feedback }],
            systemPrompt,
            maxTokens: 4096,
          });

          fullResponse = regenResponse.content;
          validationResult = this.enforcementEngine.validate(fullResponse);
          attempts++;
        }
      }

      // DG-126 Item 4: Grade F skip — don't charge cycle
      if (enforcementLevel !== 'informational' && validationResult.grade === 'F') {
        enforcementGradeF = true;
        yield {
          event: 'message',
          data: { step: 'cycle_skipped', reason: 'enforcement_grade_f', message: 'Enforcement Grade F after all retries — your cycle was NOT counted.' },
        };
      }

      // ── STEP 7: SAI micro-audit (if files changed) ──
      const changedFiles = extractChangedFiles(fullResponse);
      let saiResult: { score: number; grade: string; findings: number } | undefined;

      if (changedFiles.length > 0) {
        const audit = await this.saiEngine.audit(changedFiles);
        saiResult = { score: audit.score, grade: audit.grade, findings: audit.findings.length };
        yield { event: 'sai_audit', data: saiResult };
      }

      // ── STEP 8: Persist to intelligence (DG-126 Item 4: only if cycle should count) ──
      const duration = `${Date.now() - startTime}ms`;

      let cycle: number;
      if (!hadProviderError && !enforcementGradeF) {
        // Success: commit the cycle
        cycle = await this.intelligenceEngine.incrementCycle();
      } else {
        // Skipped: don't increment
        cycle = tentativeCycle - 1;
      }

      const bitacoraEntry: BitacoraCycleEntry = {
        cycleId: tentativeCycle,
        traceId: request.sessionId,
        timestamp: new Date().toISOString(),
        phase: 'execution',
        result: hadProviderError ? 'ERROR' : enforcementGradeF ? 'SKIPPED' : validationResult.valid ? 'SUCCESS' : 'PARTIAL',
        duration,
        promptOriginal: request.prompt,
        decisionGate: null,
        optionSelected: null,
        artifacts: [],
        metrics: {
          protocolCompliance: validationResult.score,
          decisionGatePresented: validationResult.templateCheck.details
            .some((d) => d.sectionId === 'DECISION_GATE' && d.found),
          memoryUpdated: !hadProviderError,
          reformulationsNeeded: attempts - 1,
        },
        lessonsLearned: [],
        synapticStrength: Math.min(cycle * 3, 100),
        saiAudit: saiResult ? { score: saiResult.score, grade: saiResult.grade, findingsCount: saiResult.findings } : undefined,
      };
      await this.intelligenceEngine.appendBitacora(bitacoraEntry);

      if (!hadProviderError && !enforcementGradeF) {
        await this.intelligenceEngine.updateSession({
          currentCycle: cycle,
          synapticStrength: Math.min(cycle * 3, 100),
          agentState: {
            complianceScore: validationResult.score,
            violationsCount: validationResult.violations.length,
            successfulCycles: validationResult.valid ? cycle : cycle - 1,
          },
        });
      }

      // ── STEP 9: Guidance (non-critical) ──
      let guidanceData: { nextSteps: unknown[]; orientation: string } | undefined;
      try {
        const guidance = await this.guidanceEngine.generateGuidance();
        guidanceData = { nextSteps: guidance.nextSteps.slice(0, 3), orientation: guidance.orientation };
        yield { event: 'message', data: { step: 'guidance', ...guidanceData } };
      } catch {
        // Guidance is non-critical
      }

      // ── STEP 9b: Extract inferred learnings from tool data (DG-126 Phase 2B) ──
      if (toolActions.length > 0 && !hadProviderError && !enforcementGradeF) {
        try {
          const inferredLearnings = detectInferredLearnings(toolActions, tentativeCycle);
          for (const learning of inferredLearnings) {
            await this.intelligenceEngine.addLearning(learning);
          }
          if (inferredLearnings.length > 0) {
            yield { event: 'message', data: { step: 'learnings_extracted', count: inferredLearnings.length, type: 'inferred' } };
          }
        } catch {
          // Learning extraction is non-critical
        }
      }

      // ── STEP 9c: Detect explicit learning from DG selection (DG-126 Phase 2B) ──
      let detectedDGOption: string | undefined;
      if (!hadProviderError && !enforcementGradeF) {
        try {
          const lastCycle = this.cycleContextManager.getLastCycle();
          if (lastCycle?.responseSummary) {
            const previousDG = parseDecisionGateFromResponse(lastCycle.responseSummary);
            if (previousDG.detected) {
              const selectedId = detectDGSelection(request.prompt, previousDG.options);
              if (selectedId) {
                detectedDGOption = selectedId;
                const selectedOption = previousDG.options.find((o) => o.id === selectedId);

                this.cycleContextManager.updateLastDecisionSelection(
                  selectedId,
                  selectedOption?.title ?? selectedId,
                );

                const explicitLearning: LearningEntry = {
                  id: `explicit-${tentativeCycle}-${Date.now()}`,
                  content: `User prefers: ${selectedOption?.title ?? `Option ${selectedId}`}`,
                  category: 'user-preference',
                  confidence: {
                    score: 0.6,
                    source: 'EXPLICIT',
                    evidenceCount: 1,
                    lastReinforced: new Date().toISOString(),
                    lastReinforcedCycle: tentativeCycle,
                  },
                  createdAt: new Date().toISOString(),
                  createdInCycle: tentativeCycle,
                };
                await this.intelligenceEngine.addLearning(explicitLearning);

                yield { event: 'message', data: { step: 'learnings_extracted', count: 1, type: 'explicit', option: selectedId } };
              }
            }
          }
        } catch {
          // DG detection is non-critical
        }
      }

      // ── STEP 10: Capture cycle context (DG-126 Phase 2A + 2B) ──
      const responseDG = parseDecisionGateFromResponse(fullResponse);
      this.cycleContextManager.captureCycleState({
        cycle: hadProviderError || enforcementGradeF ? tentativeCycle : cycle,
        timestamp: new Date().toISOString(),
        requirementSummary: request.prompt,
        responseSummary: fullResponse,
        decisionGate: responseDG.detected ? {
          detected: true,
          options: responseDG.options,
          selectedOption: detectedDGOption,
        } : undefined,
        enforcement: {
          score: validationResult.score,
          grade: validationResult.grade,
          violations: validationResult.violations.length,
        },
      });

      // ── DONE ──
      yield {
        event: 'done',
        data: {
          cycle: hadProviderError || enforcementGradeF ? tentativeCycle : cycle,
          compliance: { score: validationResult.score, grade: validationResult.grade, valid: validationResult.valid },
          enforcementLevel,
          cycleSkipped: hadProviderError || enforcementGradeF,
          regenerationAttempts: attempts - 1,
          saiAudit: saiResult,
          guidance: guidanceData,
          duration,
        },
      };
    } catch (error: unknown) {
      // DG-126 Item 1: Classify provider errors
      hadProviderError = true;
      const classified = error instanceof ProviderError ? error : classifyProviderError(error);

      if (classified.category !== 'UNKNOWN') {
        yield {
          event: 'provider_error',
          data: {
            category: classified.category,
            message: classified.userMessage,
            suggestion: classified.suggestion,
            statusCode: classified.statusCode,
          },
        };
      } else {
        yield {
          event: 'error',
          data: { message: error instanceof Error ? error.message : 'Unknown error' },
        };
      }
    }
  }
}

// ─── Helpers (pure functions, no class needed) ────────────────────

/**
 * Format bitacora entries for system prompt injection.
 */
export function formatBitacoraForPrompt(entries: BitacoraCycleEntry[]): string {
  if (entries.length === 0) return 'No previous cycles recorded.';

  const lines: string[] = [];
  const latestCycle = entries[0]?.cycleId ?? 0;
  if (latestCycle > entries.length) {
    lines.push(`> Showing last ${entries.length} of ~${latestCycle} cycles.\n`);
  }

  for (const entry of entries) {
    lines.push(`**Cycle ${entry.cycleId}** (${entry.timestamp}): ${entry.result}`);
    if (entry.promptOriginal) {
      lines.push(`  Prompt: ${entry.promptOriginal.substring(0, 150)}...`);
    }
    if (entry.metrics) {
      lines.push(`  Compliance: ${entry.metrics.protocolCompliance}/100`);
    }
    if (entry.saiAudit) {
      lines.push(`  SAI: ${entry.saiAudit.score}/100 (${entry.saiAudit.findingsCount} findings)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Extract director files from context documents.
 */
function extractDirectorFiles(docs: Array<{ name: string; content: string }>): {
  mantra: string;
  rules: string;
  designDoc: string;
} {
  const find = (keyword: string): string =>
    docs.find((d) => d.name.toLowerCase().includes(keyword))?.content ?? '';

  return {
    mantra: find('mantra'),
    rules: find('rules'),
    designDoc: find('design'),
  };
}

/**
 * Extract changed files from LLM response (heuristic).
 */
function extractChangedFiles(response: string): FileContent[] {
  const files: FileContent[] = [];
  const codeBlockRe = /```(?:typescript|ts|javascript|js)\s*\n\/\/\s*(?:File|file):\s*([^\n]+)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  codeBlockRe.lastIndex = 0;
  while ((match = codeBlockRe.exec(response)) !== null) {
    files.push({ path: match[1]!.trim(), content: match[2]!.trim() });
  }

  return files;
}

/** DG-126 Phase 2B: Extract file paths from tool input for learning detection */
function extractFilePathsFromInput(input: Record<string, unknown>): string[] {
  const paths: string[] = [];
  if (typeof input.file_path === 'string') paths.push(input.file_path);
  if (typeof input.path === 'string') paths.push(input.path);
  if (typeof input.pattern === 'string') paths.push(input.pattern);
  if (typeof input.command === 'string') {
    const fileMatches = input.command.match(/[\w./-]+\.\w{1,10}/g);
    if (fileMatches) paths.push(...fileMatches);
  }
  return paths;
}
