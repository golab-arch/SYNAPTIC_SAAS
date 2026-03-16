/**
 * Agent routes — main task execution endpoint (SSE streaming).
 * POST /api/agent/task — submit a task, get SSE stream
 * GET /api/agent/status — health check
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AgentLoopService } from '../../orchestrator/agent-loop.js';
import type { OrchestrationRequest } from '../../orchestrator/types.js';

interface TaskBody {
  taskId: string;
  tenantId: string;
  projectId: string;
  prompt: string;
  modelId: string;
  providerId?: string;
  apiKey?: string;
  mode?: 'SYNAPTIC' | 'ARCHITECT' | 'IMMEDIATE';
  history?: Array<{ role: string; content: string }>;
}

export async function agentRoutes(
  server: FastifyInstance,
  agentLoop: AgentLoopService,
): Promise<void> {

  server.post('/api/agent/task', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as TaskBody;

    if (!body.taskId || !body.tenantId || !body.prompt) {
      return reply.status(400).send({
        error: 'Missing required fields: taskId, tenantId, prompt',
      });
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const orchestrationRequest: OrchestrationRequest = {
      sessionId: body.taskId,
      tenantId: body.tenantId,
      projectId: body.projectId ?? 'default',
      prompt: body.prompt,
      messages: (body.history ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      provider: {
        providerId: body.providerId ?? 'anthropic',
        model: body.modelId ?? 'claude-sonnet-4-20250514',
        apiKey: body.apiKey ?? '',
      },
    };

    try {
      for await (const event of agentLoop.execute(orchestrationRequest)) {
        const data = JSON.stringify(event.data);
        reply.raw.write(`event: ${event.event}\ndata: ${data}\n\n`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  server.get('/api/agent/status', async () => {
    return { status: 'ready', timestamp: new Date().toISOString(), version: '0.1.0' };
  });
}
