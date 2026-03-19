import { useState, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { usePolling } from './hooks/usePolling';
import { useAuthStore } from './store/auth-store';
import { useSessionStore } from './store/session-store';
import { useSettingsStore } from './store/settings-store';
import { useChatStore } from './store/chat-store';
import { SetupPage } from './components/auth/SetupPage';
import { Sidebar } from './components/layout/Sidebar';
import { ChatPanel } from './components/chat/ChatPanel';
import { ChatInput } from './components/chat/ChatInput';
import { DecisionGateCard } from './components/decisions/DecisionGateCard';
import { ApiClient } from './api/client';

export function App() {
  const auth = useAuthStore();
  const session = useSessionStore();
  const settings = useSettingsStore();
  const chat = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync auth → session (use getState() to avoid reactive loop)
  useEffect(() => {
    if (auth.isAuthenticated && auth.tenantId && auth.projectId) {
      useSessionStore.getState().setSession({ tenantId: auth.tenantId, projectId: auth.projectId });
    }
  }, [auth.isAuthenticated, auth.tenantId, auth.projectId]);

  // Polling for sidebar data
  usePolling(15_000);

  // Not authenticated → setup page
  if (!auth.isAuthenticated) return <SetupPage />;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-synaptic-500">SYNAPTIC</h1>
          <span className="text-xs text-gray-500 hidden sm:inline">SaaS</span>
          <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">C{session.currentCycle}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-400 hidden sm:block">
            Str: <span className="text-synaptic-400 font-semibold">{session.synapticStrength}%</span>
          </div>
          <div className="text-xs text-gray-400 hidden sm:block">
            Comp: <span className="text-green-400 font-semibold">{session.complianceScore}</span>
          </div>
          {auth.displayName && <span className="text-xs text-gray-500 hidden md:inline">{auth.displayName}</span>}
          <button onClick={() => useChatStore.getState().clearMessages()} title="Clear chat"
            className="text-xs text-gray-500 hover:text-yellow-400">Clear</button>
          <button onClick={auth.logout} className="text-xs text-gray-500 hover:text-red-400">Logout</button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <div className={`fixed lg:relative inset-y-0 left-0 z-50 transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <Sidebar />
        </div>

        {/* Chat area */}
        <main className="flex-1 flex flex-col min-w-0">
          <ChatPanel messages={chat.messages} isStreaming={chat.isStreaming} streamingContent={chat.streamingContent} />

          {chat.pendingDecisionGate && (
            <div className="px-4">
              <DecisionGateCard
                gate={chat.pendingDecisionGate}
                onSubmit={async (option, rationale) => {
                  const gate = chat.pendingDecisionGate!;
                  const client = new ApiClient(session.tenantId, session.projectId);
                  await client.submitDecision(gate.gateId, option, rationale).catch(() => {});
                  useChatStore.getState().addMessage({
                    id: `msg-${Date.now()}`,
                    role: 'system',
                    content: `Decision Gate resolved: Option **${option}** selected.${rationale ? ` Rationale: ${rationale}` : ''}`,
                    timestamp: new Date().toISOString(),
                  });
                  useChatStore.getState().setDecisionGate(null);
                }}
              />
            </div>
          )}

          {chat.error && (
            <div className="px-4 py-2 bg-red-900/50 text-red-300 text-sm border-t border-red-800">{chat.error}</div>
          )}

          <ChatInput
            onSend={chat.sendMessage}
            onCancel={chat.cancelStream}
            isStreaming={chat.isStreaming}
            disabled={!settings.apiKeyValid}
          />
        </main>
      </div>
    </div>
  );
}
