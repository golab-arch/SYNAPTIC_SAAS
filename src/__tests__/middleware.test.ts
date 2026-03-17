/**
 * Middleware tests — auth + rate limiting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { authMiddleware, registerApiKey } from '../api/middleware/auth.js';
import { rateLimitMiddleware } from '../api/middleware/rate-limit.js';

describe('authMiddleware', () => {
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
    const server = Fastify();
    server.addHook('preHandler', authMiddleware);
    server.get('/api/test', async () => ({ ok: true }));
    await server.ready();

    const res = await server.inject({ method: 'GET', url: '/api/test' });
    expect(res.statusCode).toBe(401);
    await server.close();
  });

  it('should authenticate with valid registered key', async () => {
    registerApiKey('test-api-key-123', 'tenant-1');

    const server = Fastify();
    server.addHook('preHandler', authMiddleware);
    server.get('/api/test', async () => ({ ok: true }));
    await server.ready();

    const res = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: { authorization: 'Bearer test-api-key-123' },
    });
    expect(res.statusCode).toBe(200);
    await server.close();
  });

  it('should reject invalid key', async () => {
    const server = Fastify();
    server.addHook('preHandler', authMiddleware);
    server.get('/api/test', async () => ({ ok: true }));
    await server.ready();

    const res = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: { authorization: 'Bearer wrong-key' },
    });
    expect(res.statusCode).toBe(401);
    await server.close();
  });
});

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    // Set dev environment for higher limits
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
