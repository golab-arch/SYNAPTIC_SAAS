/**
 * Middleware tests — auth + rate limiting.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { authMiddleware } from '../api/middleware/auth.js';
import { rateLimitMiddleware } from '../api/middleware/rate-limit.js';

describe('authMiddleware', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('should skip auth for /health', async () => {
    const server = Fastify();
    server.addHook('preHandler', authMiddleware);
    server.get('/health', async () => ({ status: 'ok' }));
    await server.ready();

    const res = await server.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    await server.close();
  });

  it('should return 401 for missing Authorization header', async () => {
    process.env['NODE_ENV'] = 'production';
    process.env['SKIP_AUTH'] = '';
    const server = Fastify();
    server.addHook('preHandler', authMiddleware);
    server.get('/api/test', async () => ({ ok: true }));
    await server.ready();

    const res = await server.inject({ method: 'GET', url: '/api/test' });
    expect(res.statusCode).toBe(401);
    await server.close();
  });

  it('should bypass auth in dev mode with SKIP_AUTH=true', async () => {
    process.env['NODE_ENV'] = 'development';
    process.env['SKIP_AUTH'] = 'true';
    const server = Fastify();
    server.addHook('preHandler', authMiddleware);
    server.get('/api/test', async (req) => ({ ok: true, uid: req.user?.uid }));
    await server.ready();

    const res = await server.inject({ method: 'GET', url: '/api/test' });
    expect(res.statusCode).toBe(200);
    expect(res.json().uid).toBe('dev-user');
    await server.close();
  });

  it('should skip auth for /api/auth/config', async () => {
    process.env['NODE_ENV'] = 'production';
    process.env['SKIP_AUTH'] = '';
    const server = Fastify();
    server.addHook('preHandler', authMiddleware);
    server.get('/api/auth/config', async () => ({ projectId: 'test' }));
    await server.ready();

    const res = await server.inject({ method: 'GET', url: '/api/auth/config' });
    expect(res.statusCode).toBe(200);
    await server.close();
  });
});

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    process.env['NODE_ENV'] = 'development';
  });

  it('should allow requests within limit', async () => {
    const server = Fastify();
    server.addHook('preHandler', rateLimitMiddleware);
    server.get('/api/test', async () => ({ ok: true }));
    await server.ready();

    const res = await server.inject({ method: 'GET', url: '/api/test' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    await server.close();
  });

  it('should skip rate limit for /health', async () => {
    const server = Fastify();
    server.addHook('preHandler', rateLimitMiddleware);
    server.get('/health', async () => ({ status: 'ok' }));
    await server.ready();

    const res = await server.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    await server.close();
  });
});
