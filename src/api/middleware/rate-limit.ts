/**
 * Rate limiting middleware — per-tenant sliding window.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

const TIER_LIMITS: Record<string, number> = {
  free: 10,
  pro: 60,
  team: 120,
  enterprise: 300,
  development: 1000,
};

const counters = new Map<string, { count: number; resetAt: number }>();

/**
 * Fastify preHandler hook for rate limiting.
 */
export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.url === '/health') return;

  const tier = process.env['NODE_ENV'] === 'development' ? 'development' : 'free';
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS['free']!;
  const now = Date.now();
  const windowMs = 60_000;

  const key = `rate:${Math.floor(now / windowMs)}`;
  const counter = counters.get(key) ?? { count: 0, resetAt: now + windowMs };

  counter.count++;
  counters.set(key, counter);

  // Cleanup old entries
  if (counters.size > 5_000) {
    for (const [k, v] of counters) {
      if (v.resetAt < now) counters.delete(k);
    }
  }

  if (counter.count > limit) {
    const retryAfter = Math.ceil((counter.resetAt - now) / 1000);
    reply.header('Retry-After', String(retryAfter));
    return reply.status(429).send({
      error: 'Rate limit exceeded',
      limit,
      retryAfterSeconds: retryAfter,
    });
  }

  reply.header('X-RateLimit-Limit', String(limit));
  reply.header('X-RateLimit-Remaining', String(Math.max(0, limit - counter.count)));
}
