/**
 * Auth middleware — validates Firebase Auth tokens on every request.
 * Skips authentication for GET /health.
 */

// TODO: Implement in Phase 1

import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Fastify preHandler hook that verifies Firebase Auth tokens.
 */
export async function authMiddleware(
  _request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // TODO: Implement in Phase 1
  // 1. Skip for /health
  // 2. Extract Bearer token
  // 3. Verify with Firebase Admin SDK
  // 4. Attach user to request
  throw new Error('authMiddleware not implemented');
}
