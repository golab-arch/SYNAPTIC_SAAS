/**
 * Integration test — verifies the full 9-step AgentLoopService flow
 * using a mock ILLMProvider and in-memory storage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ILLMProvider, LLMRequest, LLMResponse, LLMStreamChunk, CostEstimate, LLMCapabilities } from '../providers/types.js';
import { EnforcementEngine } from '../engines/enforcement/enforcement-engine.js';
import { DEFAULT_ENFORCEMENT_CONFIG } from '../engines/enforcement/constants.js';
import { ProtocolEngine } from '../engines/protocol/protocol-engine.js';
import { DEFAULT_TOKEN_BUDGETS } from '../engines/protocol/constants.js';
import { IntelligenceEngine } from '../engines/intelligence/intelligence-engine.js';
import { DEFAULT_INTELLIGENCE_CONFIG } from '../engines/intelligence/constants.js';
import { SAIEngine } from '../engines/sai/sai-engine.js';
import { GuidanceEngine } from '../engines/guidance/guidance-engine.js';
import { InMemoryIntelligenceStorage } from '../storage/memory/memory-intelligence.js';
import { InMemorySAIStorage } from '../storage/memory/memory-sai.js';
import { InMemoryGuidanceStorage } from '../storage/memory/memory-guidance.js';
import { AgentLoopService } from '../orchestrator/agent-loop.js';
import type { SSEEvent } from '../orchestrator/types.js';

// ─── SYNAPTIC-compliant mock response ───────────────────────────

const MOCK_SYNAPTIC_RESPONSE = `# SYNAPTIC PROTOCOL v3.0 - RESPONSE

## SYSTEM STATE
- Project: SYNAPTIC_SAAS
- Cycle: 1
- Phase: 1/5
- Synaptic Strength: 3%
- Enforcement: STRICT

## CONTEXT VERIFICATION
- MANTRA.md loaded
- RULES.md verified
- DESIGN_DOC.md analyzed

## REQUIREMENT ANALYSIS
The user requested a test of the SYNAPTIC protocol integration.

## MANDATORY DECISION GATE

**SYSTEM HALT — AWAITING HUMAN INPUT**

### Three Implementation Options:

#### OPTION A: Conservative Approach
- Description: Minimal implementation
- Pros: Low risk, fast
- Cons: Limited scope
- Risk: LOW
- Confidence: 90%

#### OPTION B: Balanced Approach
- Description: Standard implementation
- Pros: Good balance
- Cons: Medium effort
- Risk: MEDIUM
- Confidence: 80%

#### OPTION C: Innovative Approach
- Description: Full implementation
- Pros: Complete solution
- Cons: High effort
- Risk: HIGH
- Confidence: 70%

## AWAITING DECISION

**Required Input Format: "Proceed with Option [A/B/C]"**

---
[END OF RESPONSE - ENFORCEMENT ACTIVE]`;

// ─── Mock LLM Provider ─────────────────────────────────────────

class MockLLMProvider implements ILLMProvider {
  readonly id = 'mock';
  readonly name = 'Mock Provider';
  readonly capabilities: LLMCapabilities = {
    streaming: true,
    toolUse: false,
    vision: false,
    maxContextTokens: 100_000,
    maxOutputTokens: 4096,
    supportedModels: ['mock-model'],
  };

  async sendMessage(_request: LLMRequest): Promise<LLMResponse> {
    return {
      content: MOCK_SYNAPTIC_RESPONSE,
      toolCalls: [],
      usage: { inputTokens: 500, outputTokens: 800 },
      stopReason: 'end_turn',
    };
  }

  async *streamMessage(_request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    // Stream the mock response in chunks
    const chunks = MOCK_SYNAPTIC_RESPONSE.match(/.{1,100}/g) ?? [];
    for (const chunk of chunks) {
      yield { type: 'text', content: chunk };
    }
    yield { type: 'done', usage: { inputTokens: 500, outputTokens: 800 } };
  }

  async validateApiKey(_key: string): Promise<boolean> {
    return true;
  }

  estimateCost(_request: LLMRequest): CostEstimate {
    return {
      estimatedInputTokens: 500,
      estimatedOutputTokens: 800,
      estimatedCostUSD: 0.01,
      model: 'mock-model',
      provider: 'mock',
    };
  }
}

// ─── Tests ──────────────────────────────────────────────────────

describe('AgentLoopService Integration', () => {
  let agentLoop: AgentLoopService;
  let intelligenceStorage: InMemoryIntelligenceStorage;

  beforeEach(async () => {
    // Set up all engines with in-memory storage
    const enforcementEngine = new EnforcementEngine();
    await enforcementEngine.initialize(DEFAULT_ENFORCEMENT_CONFIG);

    const protocolEngine = new ProtocolEngine();
    await protocolEngine.initialize({
      protocolVersion: '3.0',
      coreProtocol: '# SYNAPTIC PROTOCOL v3.0\nYou are a SYNAPTIC-governed AI assistant.',
      covenant: 'Follow the SYNAPTIC protocol at all times.',
      tokenBudgets: DEFAULT_TOKEN_BUDGETS,
      cacheTTL: 60_000,
    });

    intelligenceStorage = new InMemoryIntelligenceStorage();
    const intelligenceEngine = new IntelligenceEngine();
    await intelligenceEngine.initialize({
      storage: intelligenceStorage,
      ...DEFAULT_INTELLIGENCE_CONFIG,
    });

    const saiEngine = new SAIEngine();
    await saiEngine.initialize({
      checklist: [],
      severityPenalties: { CRITICAL: -25, HIGH: -15, MEDIUM: -10, LOW: -5 },
      passThreshold: 70,
      maxFileSize: 500_000,
      timeout: 5000,
      extensionWhitelist: ['.ts'],
      excludePatterns: ['node_modules'],
      storage: new InMemorySAIStorage(),
    });

    const guidanceEngine = new GuidanceEngine();
    await guidanceEngine.initialize({
      storage: new InMemoryGuidanceStorage(),
      intelligenceEngine,
      maxSuggestions: 5,
      priorityWeights: { urgency: 0.4, dependency: 0.35, complexity: 0.25 },
    });

    const mockProvider = new MockLLMProvider();

    agentLoop = new AgentLoopService(
      protocolEngine,
      intelligenceEngine,
      enforcementEngine,
      saiEngine,
      guidanceEngine,
      mockProvider,
    );
  });

  it('should complete the 9-step flow without errors', async () => {
    const events: SSEEvent[] = [];

    for await (const event of agentLoop.execute({
      sessionId: 'test-session',
      tenantId: 'test-tenant',
      projectId: 'test-project',
      messages: [],
      provider: { providerId: 'mock', model: 'mock-model', apiKey: 'test-key' },
      prompt: 'Test the SYNAPTIC protocol',
    })) {
      events.push(event);
    }

    // Should have events
    expect(events.length).toBeGreaterThan(0);

    // Last event should be 'done'
    const doneEvent = events.find((e) => e.event === 'done');
    expect(doneEvent).toBeDefined();

    // Should not have error events
    const errorEvents = events.filter((e) => e.event === 'error');
    expect(errorEvents).toHaveLength(0);
  });

  it('should pass enforcement validation with compliant response', async () => {
    const events: SSEEvent[] = [];

    for await (const event of agentLoop.execute({
      sessionId: 'test-session',
      tenantId: 'test-tenant',
      projectId: 'test-project',
      messages: [],
      provider: { providerId: 'mock', model: 'mock-model', apiKey: 'test-key' },
      prompt: 'Test the SYNAPTIC protocol',
    })) {
      events.push(event);
    }

    const doneEvent = events.find((e) => e.event === 'done');
    const data = doneEvent?.data as { compliance: { score: number; valid: boolean; grade: string } };
    expect(data.compliance.valid).toBe(true);
    expect(data.compliance.score).toBeGreaterThanOrEqual(70);

    // Should have no regeneration events (response was compliant)
    const regenEvents = events.filter((e) => e.event === 'regeneration');
    expect(regenEvents).toHaveLength(0);
  });

  it('should persist bitacora entry after execution', async () => {
    for await (const _event of agentLoop.execute({
      sessionId: 'test-session',
      tenantId: 'test-tenant',
      projectId: 'test-project',
      messages: [],
      provider: { providerId: 'mock', model: 'mock-model', apiKey: 'test-key' },
      prompt: 'Test persistence',
    })) {
      // consume events
    }

    // Check bitacora has an entry
    const entries = await intelligenceStorage.getRecentBitacora('default', 'default', 10);
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const entry = entries[entries.length - 1]!;
    expect(entry.cycleId).toBe(1);
    expect(entry.result).toBe('SUCCESS');
    expect(entry.metrics.protocolCompliance).toBeGreaterThanOrEqual(70);
  });

  it('should increment cycle on each execution', async () => {
    // First execution
    for await (const _event of agentLoop.execute({
      sessionId: 'test-session',
      tenantId: 'test-tenant',
      projectId: 'test-project',
      messages: [],
      provider: { providerId: 'mock', model: 'mock-model', apiKey: 'test-key' },
      prompt: 'First cycle',
    })) { /* consume */ }

    // Second execution
    const events: SSEEvent[] = [];
    for await (const event of agentLoop.execute({
      sessionId: 'test-session',
      tenantId: 'test-tenant',
      projectId: 'test-project',
      messages: [],
      provider: { providerId: 'mock', model: 'mock-model', apiKey: 'test-key' },
      prompt: 'Second cycle',
    })) {
      events.push(event);
    }

    const doneEvent = events.find((e) => e.event === 'done');
    const data = doneEvent?.data as { cycle: number };
    expect(data.cycle).toBe(2);
  });
});

describe('EnforcementEngine', () => {
  let engine: EnforcementEngine;

  beforeEach(async () => {
    engine = new EnforcementEngine();
    await engine.initialize(DEFAULT_ENFORCEMENT_CONFIG);
  });

  it('should validate a compliant SYNAPTIC response', () => {
    const result = engine.validate(MOCK_SYNAPTIC_RESPONSE);
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.grade).toMatch(/^[A-C]$/);
  });

  it('should reject a non-compliant response', () => {
    const result = engine.validate('Hello, this is just a regular response.');
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should generate a regeneration message', () => {
    const result = engine.validate('Not compliant');
    const message = engine.buildRegenerationMessage(result.violations, 1, 5);
    expect(message).toContain('SYNAPTIC ENFORCEMENT');
    expect(message).toContain('Attempt 1/5');
  });

  it('should wrap prompts with enforcement markers', () => {
    const wrapped = engine.wrapPrompt('Hello', 1, ['MANTRA', 'RULES']);
    expect(wrapped).toContain('[ENFORCE-SYNAPTIC-PROTOCOL]');
    expect(wrapped).toContain('Cycle: 1');
    expect(wrapped).toContain('Hello');
  });
});
