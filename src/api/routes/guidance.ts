/**
 * Guidance routes — suggestions, progress.
 */

import type { FastifyInstance } from 'fastify';
import type { IGuidanceEngine } from '../../engines/guidance/types.js';

export async function guidanceRoutes(
  server: FastifyInstance,
  engine: IGuidanceEngine,
): Promise<void> {

  server.get('/api/:tenantId/:projectId/guidance', { logLevel: 'warn' }, async () => {
    return engine.generateGuidance();
  });

  server.get('/api/:tenantId/:projectId/guidance/suggestions', async () => {
    return engine.getSuggestions();
  });

  server.get('/api/:tenantId/:projectId/guidance/progress', async () => {
    return engine.getProgress();
  });
}
