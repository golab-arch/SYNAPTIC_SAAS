import { useCallback, useRef } from 'react';
import { useChatStore } from '../store/chat-store';
import { useSessionStore } from '../store/session-store';
import { useSettingsStore } from '../store/settings-store';
import { SSEClient } from '../api/sse-client';

export function useChat() {
  const sseRef = useRef(new SSEClient());
  const iterationRef = useRef(0);
  const streamStartRef = useRef<number | null>(null);
  const chat = useChatStore();
  const session = useSessionStore();
  const settings = useSettingsStore();

  const sendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || chat.isStreaming) return;
    if (!settings.apiKey || !settings.apiKeyValid) {
      chat.setError('Please configure a valid API key first');
      return;
    }

    chat.addMessage({
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    });
    chat.setStreaming(true);
    chat.setError(null);
    chat.setProviderError(null);
    chat.clearToolEntries();
    iterationRef.current = 0;
    streamStartRef.current = Date.now();

    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const history = chat.messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));

    await sseRef.current.executeTask(
      {
        taskId,
        tenantId: session.tenantId,
        projectId: session.projectId,
        prompt,
        modelId: settings.modelId,
        providerId: settings.providerId,
        apiKey: settings.apiKey,
        mode: settings.mode,
        history,
      },
      (event) => {
        const data = event.data as Record<string, unknown>;
        switch (event.event) {
          case 'message': {
            // Extract text from various possible shapes
            let text: string | undefined;
            if (typeof event.data === 'string') {
              text = event.data;
            } else if (data?.text) {
              text = data.text as string;
            } else if (data?.content) {
              text = data.content as string;
            }
            if (text) {
              chat.appendStreamingContent(text);
            }
            break;
          }
          case 'tool_use': {
            iterationRef.current++;
            const toolName = (data?.tool ?? data?.name ?? 'unknown') as string;
            const inputPreview = typeof data?.input === 'object'
              ? JSON.stringify(data.input).substring(0, 100)
              : String(data?.tool ?? '').substring(0, 100);
            chat.addToolEntry({
              id: `tool-${Date.now()}-${iterationRef.current}`,
              toolName,
              inputPreview,
              status: 'executing',
              iteration: iterationRef.current,
            });
            chat.appendStreamingContent(`\n\n**Tool**: ${toolName}\n`);
            break;
          }
          case 'tool_result': {
            const trStatus = data?.isError ? 'Error' : 'OK';
            const trOutput = String(data?.output ?? data?.result ?? '').substring(0, 5000);
            const trTool = (data?.tool ?? '') as string;
            const entries = useChatStore.getState().toolEntries;
            const executing = [...entries].reverse().find((e) => e.status === 'executing' && e.toolName === trTool);
            if (executing) {
              chat.updateToolEntry(executing.id, {
                status: data?.isError ? 'failed' : 'completed',
                output: trOutput,
                error: data?.isError ? trOutput.substring(0, 200) : undefined,
              });
            }
            chat.appendStreamingContent(`[${trStatus}] ${trOutput.substring(0, 200)}\n\n`);
            break;
          }
          case 'regeneration':
            chat.appendStreamingContent(`\n*Regenerating (attempt ${data?.attempt}/5)...*\n\n`);
            break;
          case 'decision_gate':
            chat.setDecisionGate({
              gateId: (data?.gateId as string) ?? `gate-${Date.now()}`,
              taskId,
              title: (data?.title as string) ?? 'Decision Required',
              description: (data?.description as string) ?? '',
              options: (data?.options as Array<{ id: string; label: string; description: string; riskLevel?: 'low' | 'medium' | 'high' }>) ?? [],
              recommendation: data?.recommendation as string | undefined,
            });
            break;
          case 'sai_audit':
            session.setSAI(data as { score: number; grade: string; findings: number });
            break;
          case 'guidance':
            if (data?.nextSteps) {
              session.setGuidance({
                nextSteps: data.nextSteps as Array<{ title: string; priority: string; category: string }>,
                orientation: (data.orientation as string) ?? '',
                phaseProgress: 0,
              });
            }
            break;
          case 'done': {
            streamStartRef.current = null;
            const result = data as { cycle?: number; compliance?: { score: number; grade: string }; saiAudit?: { score: number; grade: string; findings: number } };
            chat.finalizeStreaming({
              cycle: result.cycle,
              compliance: result.compliance,
              saiAudit: result.saiAudit,
            });
            session.setSession({
              currentCycle: result.cycle,
              synapticStrength: Math.min((result.cycle ?? 0) * 3, 100),
              complianceScore: result.compliance?.score ?? 100,
            });
            break;
          }
          case 'provider_error': {
            // DG-126: Rich provider error with category + suggestion
            const pe = data as { category?: string; message?: string; suggestion?: string };
            chat.setProviderError({
              category: (pe.category as string) ?? 'UNKNOWN',
              message: (pe.message as string) ?? 'Provider error',
              suggestion: (pe.suggestion as string) ?? '',
            });
            chat.setStreaming(false);
            break;
          }
          case 'error':
            chat.setError((data?.message as string) ?? 'Unknown error');
            chat.setStreaming(false);
            break;
          default:
            break;
        }
      },
    );
  }, [chat, session, settings]);

  const cancelStream = useCallback(() => {
    sseRef.current.abort();
    chat.setStreaming(false);
  }, [chat]);

  return {
    messages: chat.messages,
    isStreaming: chat.isStreaming,
    streamingContent: chat.streamingContent,
    pendingDecisionGate: chat.pendingDecisionGate,
    error: chat.error,
    providerError: chat.providerError,
    toolEntries: chat.toolEntries,
    streamStartedAt: streamStartRef.current,
    sendMessage,
    cancelStream,
    clearMessages: chat.clearMessages,
  };
}
