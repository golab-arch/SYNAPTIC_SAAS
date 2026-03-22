/**
 * Generic provider models endpoint — lists available models for any provider.
 * GET /api/providers/:providerId/models?apiKey=xxx
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { listProviderModels, getSupportedProviders } from '../../providers/model-listing.js';

export async function providerModelsRoute(server: FastifyInstance): Promise<void> {
  server.get(
    '/api/providers/:providerId/models',
    { logLevel: 'warn' },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { providerId } = request.params as { providerId: string };
      const { apiKey } = request.query as { apiKey?: string };

      if (!apiKey) {
        return reply.status(400).send({ error: 'Missing apiKey query parameter' });
      }

      const supported = getSupportedProviders();
      if (!supported.includes(providerId)) {
        return reply.status(400).send({
          error: `Invalid provider: ${providerId}. Supported: ${supported.join(', ')}`,
        });
      }

      const models = await listProviderModels(providerId, apiKey);
      return reply.send({ models, provider: providerId, count: models.length });
    },
  );
}
