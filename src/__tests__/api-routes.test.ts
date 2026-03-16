/**
 * API Routes — integration tests.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { bootstrap } from '../bootstrap.js';

describe('API Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    const app = await bootstrap({ port: 0 });
    server = app.server;
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('ok');
      expect(body.version).toBe('0.1.0');
    });
  });

  describe('GET /api/agent/status', () => {
    it('should return ready status', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/agent/status' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('ready');
    });
  });

  describe('POST /api/agent/task', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/agent/task',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/:tenantId/:projectId/session', () => {
    it('should return session state', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tenant-1/project-1/session',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('currentCycle');
      expect(body).toHaveProperty('synapticStrength');
    });
  });

  describe('GET /api/:tenantId/:projectId/learnings', () => {
    it('should return empty learnings initially', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tenant-1/project-1/learnings',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('GET /api/:tenantId/:projectId/decisions', () => {
    it('should return empty decisions initially', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tenant-1/project-1/decisions',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('GET /api/:tenantId/:projectId/bitacora', () => {
    it('should return empty bitacora initially', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tenant-1/project-1/bitacora',
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/:tenantId/:projectId/sai/summary', () => {
    it('should return SAI summary', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tenant-1/project-1/sai/summary',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('totalAudits');
    });
  });

  describe('GET /api/:tenantId/:projectId/sai/findings', () => {
    it('should return empty findings initially', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tenant-1/project-1/sai/findings',
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
