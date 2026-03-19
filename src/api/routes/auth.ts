/**
 * Auth routes — public config endpoint for Firebase client initialization.
 */

import type { FastifyInstance } from 'fastify';

export async function authRoutes(server: FastifyInstance): Promise<void> {
  server.get('/api/auth/config', { logLevel: 'warn' }, async () => {
    return {
      apiKey: process.env['FIREBASE_API_KEY'] ?? '',
      authDomain: process.env['FIREBASE_AUTH_DOMAIN'] ?? 'synaptic-saas.firebaseapp.com',
      projectId: process.env['FIREBASE_PROJECT_ID'] ?? 'synaptic-saas',
    };
  });
}
