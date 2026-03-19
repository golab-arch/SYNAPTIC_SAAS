/**
 * OpenRouter models proxy — fetches available models using user's API key.
 * Filters to tool-supporting models only.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface ModelEntry {
  id: string;
  name: string;
  context_length: number;
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
}

export async function openrouterModelsRoute(server: FastifyInstance): Promise<void> {
  server.get('/api/openrouter/models', { logLevel: 'warn' }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { apiKey } = request.query as { apiKey?: string };
    if (!apiKey) {
      return reply.status(400).send({ error: 'Missing apiKey query param' });
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/models?supported_parameters=tools', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://synaptic-saas.com',
          'X-Title': 'SYNAPTIC_SAAS',
        },
      });

      if (!res.ok) {
        return reply.status(res.status).send({ error: `OpenRouter API: ${res.statusText}` });
      }

      const body = await res.json() as { data?: ModelEntry[] };
      const models = (body.data ?? [])
        .filter((m) => Array.isArray(m.supported_parameters) && m.supported_parameters.includes('tools'))
        .map((m) => ({
          id: m.id,
          name: m.name,
          contextLength: m.context_length,
          promptPrice: m.pricing?.prompt,
          completionPrice: m.pricing?.completion,
        }))
        .slice(0, 50);

      return reply.send({ models });
    } catch (err) {
      return reply.status(500).send({ error: String(err) });
    }
  });
}
