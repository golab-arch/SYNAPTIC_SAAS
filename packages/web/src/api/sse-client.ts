/**
 * SSE streaming client for POST /api/agent/task.
 * Uses fetch + ReadableStream (NOT EventSource, which only supports GET).
 */

export interface SSEEvent {
  event: string;
  data: unknown;
}

export type SSEEventHandler = (event: SSEEvent) => void;

export class SSEClient {
  private abortController: AbortController | null = null;

  async executeTask(
    params: {
      taskId: string;
      tenantId: string;
      projectId: string;
      prompt: string;
      modelId: string;
      providerId?: string;
      apiKey?: string;
      mode?: string;
      history?: Array<{ role: string; content: string }>;
    },
    onEvent: SSEEventHandler,
  ): Promise<void> {
    this.abort();
    this.abortController = new AbortController();
    const apiBase = import.meta.env.VITE_API_URL ?? '';

    try {
      const res = await fetch(`${apiBase}/api/agent/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: params.taskId,
          tenantScope: { tenantId: params.tenantId, projectId: params.projectId },
          prompt: params.prompt,
          provider: { providerId: params.providerId ?? 'anthropic', model: params.modelId },
          apiKey: params.apiKey,
          mode: params.mode ?? 'SYNAPTIC',
          messages: params.history ?? [],
        }),
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        onEvent({ event: 'error', data: { message: `HTTP ${res.status}` } });
        return;
      }
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      let currentData = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6).trim();
          } else if (line === '' && currentEvent && currentData) {
            try {
              onEvent({ event: currentEvent, data: JSON.parse(currentData) });
            } catch {
              onEvent({ event: currentEvent, data: currentData });
            }
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        onEvent({ event: 'error', data: { message: String(err) } });
      }
    } finally {
      this.abortController = null;
    }
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  get isActive(): boolean {
    return this.abortController !== null;
  }
}
