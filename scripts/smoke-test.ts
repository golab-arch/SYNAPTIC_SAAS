/**
 * Smoke test — manual test against real Anthropic API.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/smoke-test.ts
 *
 * This script is NOT meant for CI — it requires a real API key.
 */

import { AnthropicProvider } from '../src/providers/anthropic.js';
import { EnforcementEngine } from '../src/engines/enforcement/enforcement-engine.js';
import { DEFAULT_ENFORCEMENT_CONFIG } from '../src/engines/enforcement/constants.js';
import { ProtocolEngine } from '../src/engines/protocol/protocol-engine.js';
import { DEFAULT_TOKEN_BUDGETS } from '../src/engines/protocol/constants.js';
import { IntelligenceEngine } from '../src/engines/intelligence/intelligence-engine.js';
import { DEFAULT_INTELLIGENCE_CONFIG } from '../src/engines/intelligence/constants.js';
import { SAIEngine } from '../src/engines/sai/sai-engine.js';
import { GuidanceEngine } from '../src/engines/guidance/guidance-engine.js';
import { InMemoryIntelligenceStorage } from '../src/storage/memory/memory-intelligence.js';
import { InMemorySAIStorage } from '../src/storage/memory/memory-sai.js';
import { InMemoryGuidanceStorage } from '../src/storage/memory/memory-guidance.js';
import { AgentLoopService } from '../src/orchestrator/agent-loop.js';

async function main(): Promise<void> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    console.error('ERROR: Set ANTHROPIC_API_KEY environment variable');
    console.error('Usage: ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/smoke-test.ts');
    process.exit(1);
  }

  console.log('=== SYNAPTIC_SAAS Smoke Test ===\n');

  // Initialize provider
  console.log('1. Initializing AnthropicProvider...');
  const provider = new AnthropicProvider(apiKey);

  // Validate key
  console.log('2. Validating API key...');
  const valid = await provider.validateApiKey(apiKey);
  console.log(`   Key valid: ${valid}`);
  if (!valid) {
    console.error('   API key is invalid. Aborting.');
    process.exit(1);
  }

  // Initialize engines
  console.log('3. Initializing engines...');

  const enforcementEngine = new EnforcementEngine();
  await enforcementEngine.initialize(DEFAULT_ENFORCEMENT_CONFIG);

  const protocolEngine = new ProtocolEngine();
  await protocolEngine.initialize({
    protocolVersion: '3.0',
    coreProtocol: enforcementEngine.getSessionInitPrompt(),
    covenant: 'Follow the SYNAPTIC protocol at all times. Present Decision Gates with 3 options.',
    tokenBudgets: DEFAULT_TOKEN_BUDGETS,
    cacheTTL: 60_000,
  });

  const intelligenceEngine = new IntelligenceEngine();
  await intelligenceEngine.initialize({
    storage: new InMemoryIntelligenceStorage(),
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

  // Create agent loop
  console.log('4. Creating AgentLoopService...\n');
  const agentLoop = new AgentLoopService(
    protocolEngine,
    intelligenceEngine,
    enforcementEngine,
    saiEngine,
    guidanceEngine,
    provider,
  );

  // Execute
  console.log('5. Executing prompt...\n');
  console.log('--- SSE Events ---\n');

  let responseText = '';

  for await (const event of agentLoop.execute({
    sessionId: 'smoke-test',
    tenantId: 'local',
    projectId: 'smoke',
    messages: [],
    provider: { providerId: 'anthropic', model: 'claude-haiku-4-5-20251001', apiKey },
    prompt: 'Describe briefly what SYNAPTIC_SAAS is. Follow the SYNAPTIC protocol template.',
  })) {
    if (event.event === 'message' && typeof event.data === 'string') {
      process.stdout.write(event.data);
      responseText += event.data;
    } else {
      console.log(`\n[EVENT] ${event.event}:`, JSON.stringify(event.data, null, 2));
    }
  }

  console.log('\n\n--- End of Events ---\n');
  console.log(`Response length: ${responseText.length} chars`);
  console.log('\n=== Smoke Test Complete ===');
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
