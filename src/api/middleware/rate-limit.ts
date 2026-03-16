/**
 * Rate limiting middleware — enforces per-tier request limits.
 */

// TODO: Implement in Phase 4

import type { FastifyRequest, FastifyReply } from 'fastify';

/** Rate limits per pricing tier (requests per minute) */
const TIER_LIMITS = {
  free: 10,
  pro: 60,
  team: 120,
  enterprise: 300,
} as const;

/**
 * Fastify preHandler hook that enforces rate limits based on user tier.
 */
export async function rateLimitMiddleware(
  _request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // TODO: Implement in Phase 4
  // 1. Get user tier from request
  // 2. Check rate limit counter (Redis or in-memory)
  // 3. If exceeded, return 429
  void TIER_LIMITS;
  throw new Error('rateLimitMiddleware not implemented');
}
