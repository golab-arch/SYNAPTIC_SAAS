/**
 * Auth middleware — Bearer token verification.
 * Phase 1: simple API key auth with timing-safe comparison.
 * Phase 2: Firebase Auth token verification.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

// In-memory API key store (per-tenant)
const apiKeys = new Map<string, { tenantId: string; hashedKey: string }>();

/**
 * Fastify preHandler hook for authentication.
 * Skips /health endpoint.
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Skip health checks
  if (request.url === '/health') return;

  // Dev mode bypass
  if (process.env['NODE_ENV'] === 'development' && process.env['SKIP_AUTH'] === 'true') {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing Authorization header' });
  }

  const token = authHeader.slice(7);
  const hashedToken = createHash('sha256').update(token).digest();

  for (const [, keyData] of apiKeys) {
    const expected = Buffer.from(keyData.hashedKey, 'hex');
    if (expected.length === hashedToken.length && timingSafeEqual(expected, hashedToken)) {
      return; // Authenticated
    }
  }

  return reply.status(401).send({ error: 'Invalid API key' });
}

/**
 * Register an API key for authentication (dev/testing).
 */
export function registerApiKey(key: string, tenantId: string): void {
  const hashedKey = createHash('sha256').update(key).digest('hex');
  apiKeys.set(hashedKey, { tenantId, hashedKey });
}
