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
import { authMiddleware } from './middleware/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { agentRoutes } from './routes/agent.js';
import { intelligenceRoutes } from './routes/intelligence.js';
import { saiRoutes } from './routes/sai.js';
import { guidanceRoutes } from './routes/guidance.js';
import { keyRoutes } from './routes/keys.js';
import { openrouterModelsRoute } from './routes/openrouter-models.js';
import { projectRoutes } from './routes/projects.js';

export interface ServerDeps {
  agentLoop: AgentLoopService;
  intelligence: IIntelligenceEngine;
  sai: ISAIEngine;
  guidance: IGuidanceEngine;
  keyManager: KeyManager;
}

export async function createServer(deps: ServerDeps): Promise<FastifyInstance> {
  const server = Fastify({
    logger: process.env['NODE_ENV'] !== 'test',
  });

  // CORS
  await registerCors(server);

  // Public routes (before auth)
  await server.register(healthRoutes);
  await server.register(authRoutes);
  await server.register(openrouterModelsRoute);

  // Auth middleware
  server.addHook('preHandler', authMiddleware);

  // Protected routes
  await server.register(async (s) => agentRoutes(s, deps.agentLoop));
  await server.register(async (s) => intelligenceRoutes(s, deps.intelligence));
  await server.register(async (s) => saiRoutes(s, deps.sai));
  await server.register(async (s) => guidanceRoutes(s, deps.guidance));
  await server.register(async (s) => keyRoutes(s, deps.keyManager));
  await server.register(projectRoutes);

  return server;
}
