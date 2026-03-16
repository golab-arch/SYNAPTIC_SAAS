/**
 * Intelligence routes — session, learnings, decisions, bitacora.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { IIntelligenceEngine } from '../../engines/intelligence/types.js';

interface TenantParams {
  tenantId: string;
  projectId: string;
}

export async function intelligenceRoutes(
  server: FastifyInstance,
  engine: IIntelligenceEngine,
): Promise<void> {

  server.get('/api/:tenantId/:projectId/session', async () => {
    return engine.getSession();
  });

  server.get('/api/:tenantId/:projectId/learnings', async (request: FastifyRequest) => {
    const query = request.query as { minConfidence?: string; limit?: string };
    return engine.getLearnings({
      minConfidence: query.minConfidence ? parseFloat(query.minConfidence) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
  });

  server.get('/api/:tenantId/:projectId/decisions', async () => {
    return engine.getDecisions();
  });

  server.get('/api/:tenantId/:projectId/bitacora', async (request: FastifyRequest) => {
    const query = request.query as { limit?: string };
    return engine.getRecentBitacora(query.limit ? parseInt(query.limit, 10) : 15);
  });

  // Suppress unused params lint — tenantId/projectId will be used for scoping
  void (null as unknown as TenantParams);
}
