/**
 * CORS middleware configuration.
 */

import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export async function registerCors(server: FastifyInstance): Promise<void> {
  await server.register(cors, {
    origin: process.env['CORS_ORIGIN']?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
    credentials: true,
  });
}
