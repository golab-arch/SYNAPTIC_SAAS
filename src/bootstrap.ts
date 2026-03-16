/**
 * Bootstrap — dependency injection factory.
 * Wires all engines + storage + LLM provider + routes.
 */

import type { FastifyInstance } from 'fastify';
import { EnforcementEngine } from './engines/enforcement/enforcement-engine.js';
import { DEFAULT_ENFORCEMENT_CONFIG } from './engines/enforcement/constants.js';
import { SAIEngine } from './engines/sai/sai-engine.js';
import { DEFAULT_SAI_CHECKLIST } from './engines/sai/checklist/index.js';
import { IntelligenceEngine } from './engines/intelligence/intelligence-engine.js';
import { DEFAULT_INTELLIGENCE_CONFIG } from './engines/intelligence/constants.js';
import { GuidanceEngine } from './engines/guidance/guidance-engine.js';
import { ProtocolEngine } from './engines/protocol/protocol-engine.js';
import { DEFAULT_TOKEN_BUDGETS } from './engines/protocol/constants.js';
import { InMemoryIntelligenceStorage } from './storage/memory/memory-intelligence.js';
import { InMemorySAIStorage } from './storage/memory/memory-sai.js';
import { InMemoryGuidanceStorage } from './storage/memory/memory-guidance.js';
import { createProvider } from './providers/provider-factory.js';
import { AgentLoopService } from './orchestrator/agent-loop.js';
import { createServer } from './api/server.js';
import type { ILLMProvider } from './providers/types.js';

export interface AppConfig {
  port: number;
  llm?: {
    provider: string;
    apiKey: string;
  };
}

export interface AppInstance {
  server: FastifyInstance;
  agentLoop: AgentLoopService;
  engines: {
    enforcement: EnforcementEngine;
    sai: SAIEngine;
    intelligence: IntelligenceEngine;
    guidance: GuidanceEngine;
    protocol: ProtocolEngine;
  };
}

export async function bootstrap(config: AppConfig): Promise<AppInstance> {
  // 1. Create engines
  const enforcementEngine = new EnforcementEngine();
  await enforcementEngine.initialize(DEFAULT_ENFORCEMENT_CONFIG);

  const protocolEngine = new ProtocolEngine();
  await protocolEngine.initialize({
    protocolVersion: '3.0',
    coreProtocol: enforcementEngine.getSessionInitPrompt(),
    covenant: 'Follow the SYNAPTIC protocol. Present Decision Gates with 3 options.',
    tokenBudgets: DEFAULT_TOKEN_BUDGETS,
    cacheTTL: 60_000,
  });

  const intelligenceStorage = new InMemoryIntelligenceStorage();
  const intelligenceEngine = new IntelligenceEngine();
  await intelligenceEngine.initialize({
    storage: intelligenceStorage,
    ...DEFAULT_INTELLIGENCE_CONFIG,
  });

  const saiEngine = new SAIEngine();
  await saiEngine.initialize({
    checklist: DEFAULT_SAI_CHECKLIST,
    severityPenalties: { CRITICAL: -25, HIGH: -15, MEDIUM: -10, LOW: -5 },
    passThreshold: 70,
    maxFileSize: 500_000,
    timeout: 5000,
    extensionWhitelist: ['.ts', '.tsx', '.js', '.jsx'],
    excludePatterns: ['node_modules', 'dist', '.git'],
    storage: new InMemorySAIStorage(),
  });

  const guidanceEngine = new GuidanceEngine();
  await guidanceEngine.initialize({
    storage: new InMemoryGuidanceStorage(),
    intelligenceEngine,
    maxSuggestions: 5,
    priorityWeights: { urgency: 0.4, dependency: 0.35, complexity: 0.25 },
  });

  // 2. Create LLM provider (BYOK — API key from config or per-request)
  let llmProvider: ILLMProvider;
  if (config.llm?.apiKey) {
    llmProvider = createProvider(config.llm.provider ?? 'anthropic', config.llm.apiKey);
  } else {
    // Placeholder provider for when no default key is set (BYOK per-request)
    llmProvider = createProvider('anthropic', 'placeholder-key');
  }

  // 3. Create orchestrator
  const agentLoop = new AgentLoopService(
    protocolEngine,
    intelligenceEngine,
    enforcementEngine,
    saiEngine,
    guidanceEngine,
    llmProvider,
  );

  // 4. Create server with routes
  const server = await createServer({
    agentLoop,
    intelligence: intelligenceEngine,
    sai: saiEngine,
    guidance: guidanceEngine,
  });

  return {
    server,
    agentLoop,
    engines: {
      enforcement: enforcementEngine,
      sai: saiEngine,
      intelligence: intelligenceEngine,
      guidance: guidanceEngine,
      protocol: protocolEngine,
    },
  };
}
