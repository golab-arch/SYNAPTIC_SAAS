/**
 * BYOK key management routes.
 * POST /api/:tenantId/keys/validate — validate a key
 * POST /api/:tenantId/keys — store a key (encrypted)
 * GET /api/:tenantId/keys — list stored keys (metadata only)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { KeyManager } from '../../keys/key-manager.js';

export async function keyRoutes(
  server: FastifyInstance,
  keyManager: KeyManager,
): Promise<void> {

  server.post('/api/:tenantId/keys/validate', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { providerId?: string; apiKey?: string } | null;
    if (!body?.apiKey) {
      return reply.status(400).send({ error: 'Missing: apiKey' });
    }

    const providerId = body.providerId ?? keyManager.detectProvider(body.apiKey);
    if (!providerId) {
      return reply.status(400).send({ error: 'Cannot detect provider. Specify providerId.' });
    }

    const result = await keyManager.validateKey(providerId, body.apiKey);
    return result;
  });

  server.post('/api/:tenantId/keys', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = request.body as { providerId: string; apiKey: string } | null;

    if (!body?.providerId || !body?.apiKey) {
      return reply.status(400).send({ error: 'Missing: providerId, apiKey' });
    }

    // Validate first
    const validation = await keyManager.validateKey(body.providerId, body.apiKey);
    if (!validation.isValid) {
      return reply.status(422).send({ error: 'Invalid API key', details: validation.error });
    }

    // Encrypt and store
    const stored = keyManager.prepareForStorage(tenantId, body.providerId, body.apiKey);

    return {
      id: stored.id,
      providerId: body.providerId,
      keyPrefix: body.apiKey.substring(0, 8) + '...',
      valid: true,
    };
  });

  server.get('/api/:tenantId/keys', async () => {
    // Return metadata only — never expose decrypted keys
    return { keys: [] };
  });
}
