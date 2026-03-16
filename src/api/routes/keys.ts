/**
 * BYOK key management routes.
 * POST /v1/keys/validate — validate an API key against a provider.
 */

// TODO: Implement in Phase 2

import type { FastifyInstance } from 'fastify';

export async function keyRoutes(server: FastifyInstance): Promise<void> {
  server.post('/v1/keys/validate', async (_request, _reply) => {
    // TODO: Implement in Phase 2
    // 1. Validate request body (Zod)
    // 2. Validate key against provider (KeyManager.validateKey)
    // 3. If valid, encrypt and store (KeyManager.storeKey)
    // 4. Return validation result (NEVER return the key back)
    throw new Error('POST /v1/keys/validate not implemented');
  });
}
