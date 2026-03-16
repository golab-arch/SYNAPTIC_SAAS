/**
 * AgentLoopService — the heart of SYNAPTIC_SAAS.
 * Orchestrates the 5 engines + LLM + tools in the 9-step execution flow.
 * Contains NO business logic — only orchestration.
 */

import type { ILLMProvider, LLMMessage } from '../providers/types.js';
import type { IEnforcementEngine } from '../engines/enforcement/types.js';
import type { ISAIEngine, FileContent } from '../engines/sai/types.js';
import type { IIntelligenceEngine, BitacoraCycleEntry } from '../engines/intelligence/types.js';
import type { IGuidanceEngine } from '../engines/guidance/types.js';
import type { IProtocolEngine } from '../engines/protocol/types.js';
import type {
  OrchestrationRequest,
  SSEEvent,
} from './types.js';

export interface AgentLoopConfig {
  readonly maxRegenerationAttempts: number;
}

const DEFAULT_CONFIG: AgentLoopConfig = {
  maxRegenerationAttempts: 5,
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
      // STEP 1: Increment cycle
      const cycle = await this.intelligenceEngine.incrementCycle();
      yield { event: 'message', data: { step: 'cycle', cycle } };

      // STEP 2: Build system prompt (Protocol Engine + Intelligence Engine)
      const intelligenceSummary = await this.intelligenceEngine.getIntelligenceSummary();
      const recentBitacora = await this.intelligenceEngine.getRecentBitacora(15);
      const bitacoraHistory = recentBitacora
        .map((e) => `Cycle ${e.cycleId}: ${e.phase} — ${e.result}`)
        .join('\n');

      const systemPrompt = await this.protocolEngine.buildSystemPrompt({
        cycle,
        mode: 'SYNAPTIC',
        directorFiles: {
          mantra: '', // Will be loaded from storage in future
          rules: '',
          designDoc: '',
        },
        intelligenceSummary,
        bitacoraHistory,
        userLanguage: 'es',
        modelId: request.provider.model,
      });

      // STEP 3: Wrap user prompt with enforcement markers
      const wrappedPrompt = this.protocolEngine.wrapUserPrompt({
        userPrompt: request.prompt,
        cycle,
        loadedFiles: ['MANTRA', 'RULES', 'DESIGN_DOC', 'INTELLIGENCE'],
        enforcementMode: 'STRICT',
      });

      // STEP 4: LLM interaction (streaming)
      let fullResponse = '';
      const messages: LLMMessage[] = [
        ...request.messages,
        { role: 'user' as const, content: wrappedPrompt },
      ];

      for await (const chunk of this.llmProvider.streamMessage({
        model: request.provider.model,
        messages,
        systemPrompt,
        maxTokens: 4096,
      })) {
        if (chunk.type === 'text' && chunk.content) {
          fullResponse += chunk.content;
          yield { event: 'message', data: chunk.content };
        } else if (chunk.type === 'done') {
          yield { event: 'message', data: { step: 'llm_done', usage: chunk.usage } };
        }
      }

      // STEP 5: Enforcement validation + regeneration loop
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

        // Re-send to LLM (non-streaming for regeneration)
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

      // STEP 6: SAI audit (skip if no changed files — tools not connected yet)
      const changedFiles: FileContent[] = []; // Will come from tool executor
      if (changedFiles.length > 0) {
        const auditResult = await this.saiEngine.audit(changedFiles);
        yield { event: 'sai_audit', data: auditResult };
      }

      // STEP 7: Persist to bitacora
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
      };
      await this.intelligenceEngine.appendBitacora(bitacoraEntry);

      // STEP 8: Update session
      await this.intelligenceEngine.updateSession({
        currentCycle: cycle,
        synapticStrength: Math.min(cycle * 3, 100),
        agentState: {
          complianceScore: validationResult.score,
          violationsCount: validationResult.violations.length,
          successfulCycles: validationResult.valid ? cycle : cycle - 1,
        },
      });

      // STEP 9: Guidance (try, but don't fail if not fully implemented)
      let guidance = null;
      try {
        guidance = await this.guidanceEngine.generateGuidance();
      } catch {
        // Guidance not critical — skip if not implemented
      }

      yield {
        event: 'done',
        data: {
          cycle,
          compliance: validationResult.score,
          grade: validationResult.grade,
          valid: validationResult.valid,
          regenerationAttempts: attempts - 1,
          duration,
          guidance: guidance?.nextSteps?.slice(0, 3) ?? [],
        },
      };
    } catch (error: unknown) {
      yield {
        event: 'error',
        data: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }
}
