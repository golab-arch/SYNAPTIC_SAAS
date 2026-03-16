/**
 * Fastify server setup — API Gateway for SYNAPTIC_SAAS.
 * All routes versioned under /v1/. All endpoints authenticated except /health.
 */

// TODO: Implement in Phase 1

import type { FastifyInstance } from 'fastify';

/**
 * Create and configure the Fastify server with all routes and middleware.
 */
export async function createServer(): Promise<FastifyInstance> {
  // TODO: Implement in Phase 1
  // 1. Create Fastify instance with logger
  // 2. Register auth middleware (skip for /health)
  // 3. Register rate limiting
  // 4. Register routes: health, sessions, execute, keys
  // 5. Register SSE support
  throw new Error('createServer not implemented');
}

/**
 * Start the server on the configured port.
 */
export async function startServer(server: FastifyInstance, port: number): Promise<void> {
  // TODO: Implement in Phase 1
  void server;
  void port;
  throw new Error('startServer not implemented');
}
