/**
 * Session management routes.
 * POST /v1/sessions — create a new orchestration session.
 */

// TODO: Implement in Phase 1

import type { FastifyInstance } from 'fastify';

export async function sessionRoutes(server: FastifyInstance): Promise<void> {
  server.post('/v1/sessions', async (_request, _reply) => {
    // TODO: Implement in Phase 1
    // 1. Validate request body (Zod)
    // 2. Create session in Firestore
    // 3. Return session ID
    throw new Error('POST /v1/sessions not implemented');
  });
}
