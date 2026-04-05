/**
 * Intelligence routes — session, learnings, decisions, bitacora.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { IIntelligenceEngine } from '../../engines/intelligence/types.js';

interface TenantParams {
  tenantId: string;
  projectId: string;
}

export async function intelligenceRoutes(
  server: FastifyInstance,
  engine: IIntelligenceEngine,
): Promise<void> {

  server.get('/api/:tenantId/:projectId/session', { logLevel: 'warn' }, async () => {
    return engine.getSession();
  });

  server.get('/api/:tenantId/:projectId/learnings', async (request: FastifyRequest) => {
    const query = request.query as { minConfidence?: string; limit?: string };
    return engine.getLearnings({
      minConfidence: query.minConfidence ? parseFloat(query.minConfidence) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
  });

  server.get('/api/:tenantId/:projectId/decisions', async () => {
    return engine.getDecisions();
  });

  server.get('/api/:tenantId/:projectId/bitacora', async (request: FastifyRequest) => {
    const query = request.query as { limit?: string };
    return engine.getRecentBitacora(query.limit ? parseInt(query.limit, 10) : 15);
  });

  server.post('/api/:tenantId/:projectId/decision', async (request: FastifyRequest) => {
    const body = request.body as { gateId: string; selectedOption: string; rationale?: string };
    if (!body.gateId || !body.selectedOption) {
      return { error: 'Missing gateId or selectedOption' };
    }
    const emptyOption = { title: '', description: '', pros: [] as string[], cons: [] as string[], risk: 'LOW' as const, complexity: 'LOW' as const, confidence: 50 };
    await engine.recordDecision({
      decisionId: `dec-${Date.now()}`,
      cycle: 0,
      timestamp: new Date().toISOString(),
      decisionPoint: body.gateId,
      options: { optionA: emptyOption, optionB: emptyOption, optionC: emptyOption },
      selectedOption: body.selectedOption as 'A' | 'B' | 'C',
      userRationale: body.rationale,
    });
    return { ok: true, gateId: body.gateId, selectedOption: body.selectedOption };
  });

  // ── DG-126 Phase 3B: Learning action endpoints ──

  server.post('/api/:tenantId/:projectId/learnings/:learningId/boost', async (request: FastifyRequest) => {
    const { learningId } = request.params as TenantParams & { learningId: string };
    await engine.reinforceLearning(learningId, 'EXPLICIT');
    return { ok: true, action: 'boost', learningId };
  });

  server.post('/api/:tenantId/:projectId/learnings/:learningId/degrade', async (request: FastifyRequest) => {
    const { learningId } = request.params as TenantParams & { learningId: string };
    const learnings = await engine.getLearnings();
    const learning = learnings.find((l) => l.id === learningId);
    if (!learning) return { ok: false, error: 'Learning not found' };
    const newScore = Math.max(0, learning.confidence.score - 0.15);
    const ok = await engine.updateLearningConfidence(learningId, newScore);
    return { ok, action: 'degrade', learningId, newScore };
  });

  server.post('/api/:tenantId/:projectId/learnings/:learningId/forget', async (request: FastifyRequest) => {
    const { learningId } = request.params as TenantParams & { learningId: string };
    const ok = await engine.updateLearningConfidence(learningId, 0);
    return { ok, action: 'forget', learningId };
  });

  server.post('/api/:tenantId/:projectId/learnings/:learningId/restore', async (request: FastifyRequest) => {
    const { learningId } = request.params as TenantParams & { learningId: string };
    const ok = await engine.updateLearningConfidence(learningId, 0.4, 'EXPLICIT');
    return { ok, action: 'restore', learningId };
  });

  // Suppress unused params lint — tenantId/projectId will be used for scoping
  void (null as unknown as TenantParams);
}
