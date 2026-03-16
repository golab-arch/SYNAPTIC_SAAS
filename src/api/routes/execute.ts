/**
 * Execution route — main endpoint for LLM orchestration.
 * POST /v1/execute — sends a message through the agent loop, streams response via SSE.
 */

// TODO: Implement in Phase 1

import type { FastifyInstance } from 'fastify';

export async function executeRoutes(server: FastifyInstance): Promise<void> {
  server.post('/v1/execute', async (_request, _reply) => {
    // TODO: Implement in Phase 1
    // 1. Validate request body (Zod)
    // 2. Retrieve user's API key (KeyManager)
    // 3. Create provider (ProviderFactory)
    // 4. Run AgentLoopService.execute()
    // 5. Stream response via SSE
    throw new Error('POST /v1/execute not implemented');
  });
}
