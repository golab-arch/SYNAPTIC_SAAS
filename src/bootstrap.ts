/**
 * Bootstrap — dependency injection factory.
 * Wires all engines + storage + LLM provider + key manager + routes.
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
import { createStorageAdapters, type StorageType } from './storage/storage-factory.js';
import { createProvider } from './providers/provider-factory.js';
import { KeyManager } from './keys/key-manager.js';
import { AgentLoopService } from './orchestrator/agent-loop.js';
import { createServer } from './api/server.js';
import type { ILLMProvider } from './providers/types.js';

export interface AppConfig {
  port: number;
  storageType?: StorageType;
  llm?: { provider: string; apiKey: string };
  encryptionKey?: string;
}

export interface AppInstance {
  server: FastifyInstance;
  agentLoop: AgentLoopService;
  keyManager: KeyManager;
  engines: {
    enforcement: EnforcementEngine;
    sai: SAIEngine;
    intelligence: IntelligenceEngine;
    guidance: GuidanceEngine;
    protocol: ProtocolEngine;
  };
}

export async function bootstrap(config: AppConfig): Promise<AppInstance> {
  // 1. Storage adapters
  const storage = createStorageAdapters(config.storageType ?? 'memory');

  // 2. Engines
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

  const intelligenceEngine = new IntelligenceEngine();
  await intelligenceEngine.initialize({
    storage: storage.intelligence,
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
    storage: storage.sai,
  });

  const guidanceEngine = new GuidanceEngine();
  await guidanceEngine.initialize({
    storage: storage.guidance,
    intelligenceEngine,
    maxSuggestions: 5,
    priorityWeights: { urgency: 0.4, dependency: 0.35, complexity: 0.25 },
  });

  // 3. Key manager (BYOK)
  const keyManager = new KeyManager(config.encryptionKey);

  // 4. Default LLM provider
  let llmProvider: ILLMProvider;
  if (config.llm?.apiKey) {
    llmProvider = createProvider(config.llm.provider ?? 'anthropic', config.llm.apiKey);
  } else {
    llmProvider = createProvider('anthropic', 'placeholder-key');
  }

  // 5. Orchestrator
  const agentLoop = new AgentLoopService(
    protocolEngine,
    intelligenceEngine,
    enforcementEngine,
    saiEngine,
    guidanceEngine,
    llmProvider,
  );

  // 6. Server
  const server = await createServer({
    agentLoop,
    intelligence: intelligenceEngine,
    sai: saiEngine,
    guidance: guidanceEngine,
    keyManager,
  });

  return {
    server,
    agentLoop,
    keyManager,
    engines: {
      enforcement: enforcementEngine,
      sai: saiEngine,
      intelligence: intelligenceEngine,
      guidance: guidanceEngine,
      protocol: protocolEngine,
    },
  };
}
