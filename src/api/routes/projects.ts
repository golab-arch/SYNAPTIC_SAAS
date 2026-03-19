/**
 * Project CRUD routes — create, list, get, delete user projects.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createProject, listProjects, getProject, deleteProject } from '../../models/project.js';
import { TIER_LIMITS } from '../../models/user.js';

export async function projectRoutes(server: FastifyInstance): Promise<void> {

  // POST /api/projects — Create project
  server.post('/api/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) return reply.status(401).send({ error: 'Not authenticated' });

    const body = request.body as { name?: string; description?: string; framework?: string };
    if (!body.name?.trim()) {
      return reply.status(400).send({ error: 'Project name is required' });
    }

    // Check project limit
    const existing = listProjects(user.uid);
    const limit = TIER_LIMITS[user.tier]?.maxProjects ?? 3;
    if (existing.length >= limit) {
      return reply.status(429).send({
        error: 'Project limit reached',
        current: existing.length,
        limit,
        tier: user.tier,
      });
    }

    const project = createProject(user.uid, {
      name: body.name.trim(),
      description: body.description,
      framework: body.framework,
    });
    return reply.status(201).send(project);
  });

  // GET /api/projects — List user's projects
  server.get('/api/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) return reply.status(401).send({ error: 'Not authenticated' });
    return reply.send({ projects: listProjects(user.uid) });
  });

  // GET /api/projects/:id — Get project detail
  server.get('/api/projects/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) return reply.status(401).send({ error: 'Not authenticated' });
    const { id } = request.params as { id: string };
    const project = getProject(id, user.uid);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return reply.send(project);
  });

  // DELETE /api/projects/:id — Delete project
  server.delete('/api/projects/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) return reply.status(401).send({ error: 'Not authenticated' });
    const { id } = request.params as { id: string };
    const deleted = deleteProject(id, user.uid);
    if (!deleted) return reply.status(404).send({ error: 'Project not found' });
    return reply.send({ ok: true });
  });
}
