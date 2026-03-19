/**
 * Health check endpoint — the only unauthenticated route.
 * GET /health → { status: 'ok', timestamp: ISO-8601 }
 */

import type { FastifyInstance } from 'fastify';

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  server.get('/health', { logLevel: 'warn' }, async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  });
}
