/**
 * Fastify server setup with middleware + all route registrations.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import type { AgentLoopService } from '../orchestrator/agent-loop.js';
import type { IIntelligenceEngine } from '../engines/intelligence/types.js';
import type { ISAIEngine } from '../engines/sai/types.js';
import type { IGuidanceEngine } from '../engines/guidance/types.js';
import type { KeyManager } from '../keys/key-manager.js';
import { registerCors } from './middleware/cors.js';
import { healthRoutes } from './routes/health.js';
import { agentRoutes } from './routes/agent.js';
import { intelligenceRoutes } from './routes/intelligence.js';
import { saiRoutes } from './routes/sai.js';
import { guidanceRoutes } from './routes/guidance.js';
import { keyRoutes } from './routes/keys.js';

export interface ServerDeps {
  agentLoop: AgentLoopService;
  intelligence: IIntelligenceEngine;
  sai: ISAIEngine;
  guidance: IGuidanceEngine;
  keyManager: KeyManager;
}

/**
 * Create and configure the Fastify server.
 */
export async function createServer(deps: ServerDeps): Promise<FastifyInstance> {
  const server = Fastify({
    logger: process.env['NODE_ENV'] !== 'test',
  });

  // CORS
  await registerCors(server);

  // Health (unauthenticated)
  await server.register(healthRoutes);

  // Engine routes
  await server.register(async (s) => agentRoutes(s, deps.agentLoop));
  await server.register(async (s) => intelligenceRoutes(s, deps.intelligence));
  await server.register(async (s) => saiRoutes(s, deps.sai));
  await server.register(async (s) => guidanceRoutes(s, deps.guidance));
  await server.register(async (s) => keyRoutes(s, deps.keyManager));

  return server;
}
