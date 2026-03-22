/**
 * Auth middleware — Firebase token verification (prod) + dev bypass.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyFirebaseToken, extractBearerToken } from '../../auth/firebase-auth.js';
import type { AuthenticatedUser } from '../../auth/types.js';

// Extend FastifyRequest with user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

const PUBLIC_PATHS = ['/health', '/api/auth/config', '/api/providers'];

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Skip public routes
  if (PUBLIC_PATHS.some((p) => request.url.startsWith(p))) return;

  // Dev/test mode bypass (NODE_ENV undefined = dev by default)
  const env = process.env['NODE_ENV'];
  const isDev = !env || env === 'development' || env === 'test';
  if (isDev && process.env['SKIP_AUTH'] !== 'false') {
    request.user = {
      uid: 'dev-user',
      email: 'dev@synaptic.dev',
      displayName: 'Dev User',
      photoURL: null,
      provider: 'development',
      tier: 'free',
    };
    return;
  }

  const token = extractBearerToken(request.headers.authorization);
  if (!token) {
    return reply.status(401).send({ error: 'Missing authorization' });
  }

  try {
    request.user = await verifyFirebaseToken(token);
  } catch {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}
