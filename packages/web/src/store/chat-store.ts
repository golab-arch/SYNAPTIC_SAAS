import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    cycle?: number;
    compliance?: { score: number; grade: string };
    saiAudit?: { score: number; grade: string; findings: number };
    toolCalls?: Array<{ name: string; isError: boolean }>;
    regenerationAttempts?: number;
  };
}

export interface DecisionGate {
  gateId: string;
  taskId: string;
  title: string;
  description: string;
  options: Array<{
    id: string;
    label: string;
    description: string;
    riskLevel?: 'low' | 'medium' | 'high';
  }>;
  recommendation?: string;
}

export interface ProviderErrorInfo {
  category: string;
  message: string;
  suggestion: string;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  pendingDecisionGate: DecisionGate | null;
  error: string | null;
  providerError: ProviderErrorInfo | null;

  addMessage: (msg: ChatMessage) => void;
  setStreaming: (s: boolean) => void;
  appendStreamingContent: (chunk: string) => void;
  finalizeStreaming: (metadata?: ChatMessage['metadata']) => void;
  setDecisionGate: (gate: DecisionGate | null) => void;
  setError: (error: string | null) => void;
  setProviderError: (error: ProviderErrorInfo | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isStreaming: false,
      streamingContent: '',
      pendingDecisionGate: null,
      error: null,
      providerError: null,

      addMessage: (msg) => set((s) => ({ messages: [...s.messages.slice(-99), msg] })),

      setStreaming: (isStreaming) => set({ isStreaming, streamingContent: isStreaming ? '' : get().streamingContent }),

      appendStreamingContent: (chunk) => set((s) => ({ streamingContent: s.streamingContent + chunk })),

      finalizeStreaming: (metadata) => set((s) => ({
        messages: [...s.messages.slice(-99), {
          id: `msg-${Date.now()}`,
          role: 'assistant' as const,
          content: s.streamingContent,
          timestamp: new Date().toISOString(),
          metadata,
        }],
        isStreaming: false,
        streamingContent: '',
      })),

      setDecisionGate: (gate) => set({ pendingDecisionGate: gate }),
      setError: (error) => set({ error }),
      setProviderError: (providerError) => set({ providerError }),
      clearMessages: () => set({ messages: [], streamingContent: '', isStreaming: false }),
    }),
    { name: 'synaptic-chat', partialize: (s) => ({ messages: s.messages }) },
  ),
);
