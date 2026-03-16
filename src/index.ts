/**
 * SYNAPTIC_SAAS — Entry point.
 * Cloud-native AI orchestration platform with BYOK model.
 */

import { bootstrap } from './bootstrap.js';

async function main(): Promise<void> {
  const port = Number(process.env['PORT'] ?? 3000);
  const apiKey = process.env['ANTHROPIC_API_KEY'] ?? '';

  console.log('SYNAPTIC_SAAS starting...');

  const app = await bootstrap({
    port,
    llm: apiKey ? { provider: 'anthropic', apiKey } : undefined,
  });

  await app.server.listen({ port, host: '0.0.0.0' });

  console.log(`SYNAPTIC_SAAS running on port ${port}`);
  console.log(`  Health: http://localhost:${port}/health`);
  console.log(`  Agent:  POST http://localhost:${port}/api/agent/task`);
  console.log(`  Status: GET  http://localhost:${port}/api/agent/status`);
}

main().catch((error: unknown) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
