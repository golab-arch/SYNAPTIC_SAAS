/**
 * Fastify server setup with all route registrations.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import type { AgentLoopService } from '../orchestrator/agent-loop.js';
import type { IIntelligenceEngine } from '../engines/intelligence/types.js';
import type { ISAIEngine } from '../engines/sai/types.js';
import type { IGuidanceEngine } from '../engines/guidance/types.js';
import { healthRoutes } from './routes/health.js';
import { agentRoutes } from './routes/agent.js';
import { intelligenceRoutes } from './routes/intelligence.js';
import { saiRoutes } from './routes/sai.js';
import { guidanceRoutes } from './routes/guidance.js';

export interface ServerDeps {
  agentLoop: AgentLoopService;
  intelligence: IIntelligenceEngine;
  sai: ISAIEngine;
  guidance: IGuidanceEngine;
}

/**
 * Create and configure the Fastify server with all routes.
 */
export async function createServer(deps: ServerDeps): Promise<FastifyInstance> {
  const server = Fastify({ logger: true });

  // Health check (unauthenticated)
  await server.register(healthRoutes);

  // Engine routes
  await server.register(async (s) => agentRoutes(s, deps.agentLoop));
  await server.register(async (s) => intelligenceRoutes(s, deps.intelligence));
  await server.register(async (s) => saiRoutes(s, deps.sai));
  await server.register(async (s) => guidanceRoutes(s, deps.guidance));

  return server;
}
