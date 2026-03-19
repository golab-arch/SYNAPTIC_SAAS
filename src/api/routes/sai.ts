/**
 * SAI routes — audit state, findings, history.
 */

import type { FastifyInstance } from 'fastify';
import type { ISAIEngine } from '../../engines/sai/types.js';

export async function saiRoutes(
  server: FastifyInstance,
  engine: ISAIEngine,
): Promise<void> {

  server.get('/api/:tenantId/:projectId/sai/summary', { logLevel: 'warn' }, async () => {
    return engine.getSummary();
  });

  server.get('/api/:tenantId/:projectId/sai/findings', async () => {
    return engine.getActiveFindings();
  });

  server.get('/api/:tenantId/:projectId/sai/history', async () => {
    return engine.getAuditHistory();
  });

  server.get('/api/:tenantId/:projectId/sai/trend', async () => {
    return engine.getScoreTrend();
  });
}
