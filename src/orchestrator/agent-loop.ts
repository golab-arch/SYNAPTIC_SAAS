/**
 * AgentLoopService — the heart of SYNAPTIC_SAAS.
 * Orchestrates the 5 engines + LLM in the 9-step execution flow.
 * Contains NO business logic — only orchestration.
 */

import type { ILLMProvider, LLMMessage } from '../providers/types.js';
import type { IEnforcementEngine } from '../engines/enforcement/types.js';
import type { ISAIEngine, FileContent } from '../engines/sai/types.js';
import type { IIntelligenceEngine, BitacoraCycleEntry } from '../engines/intelligence/types.js';
import type { IGuidanceEngine } from '../engines/guidance/types.js';
import type { IProtocolEngine } from '../engines/protocol/types.js';
import type { ToolExecutor } from '../tools/tool-executor.js';
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

  constructor(
    private readonly protocolEngine: IProtocolEngine,
    private readonly intelligenceEngine: IIntelligenceEngine,
    private readonly enforcementEngine: IEnforcementEngine,
    private readonly saiEngine: ISAIEngine,
    private readonly guidanceEngine: IGuidanceEngine,
    private readonly llmProvider: ILLMProvider,
    private readonly toolExecutor?: ToolExecutor,
    config?: Partial<AgentLoopConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute the full 9-step orchestration loop.
   */
  async *execute(request: OrchestrationRequest): AsyncGenerator<SSEEvent> {
    const startTime = Date.now();

    try {
      // ── STEP 1: Increment cycle ──
      const cycle = await this.intelligenceEngine.incrementCycle();
      yield { event: 'message', data: { step: 'cycle', cycle } };

      // ── STEP 2: Pre-cycle maintenance (learning decay) ──
      if (cycle >= this.config.decayStartCycle) {
        const archived = await this.intelligenceEngine.applyDecay(cycle);
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
        cycle,
        mode: 'SYNAPTIC',
        directorFiles,
        intelligenceSummary,
        bitacoraHistory,
        userLanguage: 'es',
        modelId: request.provider.model,
      });

      // ── STEP 4: Wrap user prompt with enforcement markers ──
      const loadedFiles = Object.entries(directorFiles)
        .filter(([, v]) => v.length > 0)
        .map(([k]) => k.toUpperCase());
      if (intelligenceSummary.topLearnings.length > 0) loadedFiles.push('INTELLIGENCE');

      const wrappedPrompt = this.protocolEngine.wrapUserPrompt({
        userPrompt: request.prompt,
        cycle,
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

      for (let toolRound = 0; toolRound < maxToolRounds; toolRound++) {
        let currentToolId: string | undefined;
        let currentToolName: string | undefined;
        let toolInputJson = '';
        const pendingToolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

        for await (const chunk of this.llmProvider.streamMessage({
          model: request.provider.model,
          messages,
          systemPrompt,
          tools: toolDefs,
          maxTokens: 4096,
        })) {
          if (chunk.type === 'text' && chunk.content) {
            fullResponse += chunk.content;
            yield { event: 'message', data: chunk.content };
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
        }
      }

      // ── STEP 6: Enforcement validation + regeneration loop ──
      let validationResult = this.enforcementEngine.validate(fullResponse);
      let attempts = 1;

      while (!validationResult.valid && attempts < this.config.maxRegenerationAttempts) {
        yield {
          event: 'regeneration',
          data: {
            attempt: attempts,
            score: validationResult.score,
            violations: validationResult.violations.length,
          },
        };

        const feedback = this.enforcementEngine.buildRegenerationMessage(
          validationResult.violations,
          attempts,
          this.config.maxRegenerationAttempts,
        );

        const regenResponse = await this.llmProvider.sendMessage({
          model: request.provider.model,
          messages: [
            ...messages,
            { role: 'assistant' as const, content: fullResponse },
            { role: 'user' as const, content: feedback },
          ],
          systemPrompt,
          maxTokens: 4096,
        });

        fullResponse = regenResponse.content;
        validationResult = this.enforcementEngine.validate(fullResponse);
        attempts++;
      }

      // ── STEP 7: SAI micro-audit (if files changed) ──
      const changedFiles = extractChangedFiles(fullResponse);
      let saiResult: { score: number; grade: string; findings: number } | undefined;

      if (changedFiles.length > 0) {
        const audit = await this.saiEngine.audit(changedFiles);
        saiResult = { score: audit.score, grade: audit.grade, findings: audit.findings.length };
        yield { event: 'sai_audit', data: saiResult };
      }

      // ── STEP 8: Persist to intelligence ──
      const duration = `${Date.now() - startTime}ms`;
      const bitacoraEntry: BitacoraCycleEntry = {
        cycleId: cycle,
        traceId: request.sessionId,
        timestamp: new Date().toISOString(),
        phase: 'execution',
        result: validationResult.valid ? 'SUCCESS' : 'PARTIAL',
        duration,
        promptOriginal: request.prompt,
        decisionGate: null,
        optionSelected: null,
        artifacts: [],
        metrics: {
          protocolCompliance: validationResult.score,
          decisionGatePresented: validationResult.templateCheck.details
            .some((d) => d.sectionId === 'DECISION_GATE' && d.found),
          memoryUpdated: true,
          reformulationsNeeded: attempts - 1,
        },
        lessonsLearned: [],
        synapticStrength: Math.min(cycle * 3, 100),
        saiAudit: saiResult ? { score: saiResult.score, grade: saiResult.grade, findingsCount: saiResult.findings } : undefined,
      };
      await this.intelligenceEngine.appendBitacora(bitacoraEntry);

      // Update session state
      await this.intelligenceEngine.updateSession({
        currentCycle: cycle,
        synapticStrength: Math.min(cycle * 3, 100),
        agentState: {
          complianceScore: validationResult.score,
          violationsCount: validationResult.violations.length,
          successfulCycles: validationResult.valid ? cycle : cycle - 1,
        },
      });

      // ── STEP 9: Guidance (non-critical) ──
      let guidanceData: { nextSteps: unknown[]; orientation: string } | undefined;
      try {
        const guidance = await this.guidanceEngine.generateGuidance();
        guidanceData = {
          nextSteps: guidance.nextSteps.slice(0, 3),
          orientation: guidance.orientation,
        };
        yield { event: 'message', data: { step: 'guidance', ...guidanceData } };
      } catch {
        // Guidance is non-critical
      }

      // ── DONE ──
      yield {
        event: 'done',
        data: {
          cycle,
          compliance: validationResult.score,
          grade: validationResult.grade,
          valid: validationResult.valid,
          regenerationAttempts: attempts - 1,
          saiAudit: saiResult,
          guidance: guidanceData,
          duration,
        },
      };
    } catch (error: unknown) {
      yield {
        event: 'error',
        data: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
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
