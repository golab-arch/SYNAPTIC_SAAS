import { useState, useEffect } from 'react';
import { useAuthStore } from './store/auth-store';
import { useSessionStore } from './store/session-store';
import { useSettingsStore } from './store/settings-store';
import { useChatStore } from './store/chat-store';
import { useChat } from './hooks/useChat';
import { usePolling } from './hooks/usePolling';
import { LandingPage } from './components/landing/LandingPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { Sidebar } from './components/layout/Sidebar';
import { ChatPanel } from './components/chat/ChatPanel';
import { ChatInput } from './components/chat/ChatInput';
import { DecisionGateCard } from './components/decisions/DecisionGateCard';
import { ProviderErrorModal } from './components/chat/ProviderErrorModal';
import { ActivityLog } from './components/chat/ActivityLog';
import { ApiClient } from './api/client';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-synaptic-500 mb-2">SYNAPTIC</h1>
        <div className="flex gap-1 justify-center">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2 h-2 bg-synaptic-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatView({ projectId, projectName, onBack }: { projectId: string; projectName: string; onBack: () => void }) {
  const auth = useAuthStore();
  const session = useSessionStore();
  const settings = useSettingsStore();
  const chat = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync project → session
  useEffect(() => {
    useSessionStore.getState().setSession({ tenantId: auth.uid ?? 'dev-user', projectId });
  }, [auth.uid, projectId]);

  usePolling(15_000);

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
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-synaptic-400">Dashboard</button>
          <span className="text-gray-700">|</span>
          <span className="text-sm font-semibold text-white">{projectName}</span>
          <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">C{session.currentCycle}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:block">
            Str: <span className="text-synaptic-400 font-semibold">{session.synapticStrength}%</span>
          </span>
          <span className="text-xs text-gray-400 hidden sm:block">
            Comp: <span className="text-green-400 font-semibold">{session.complianceScore}</span>
          </span>
          <button onClick={() => useChatStore.getState().clearMessages()} title="Clear chat"
            className="text-xs text-gray-500 hover:text-yellow-400">Clear</button>
          <button onClick={() => auth.logout()} className="text-xs text-gray-500 hover:text-red-400">Logout</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <div className={`fixed lg:relative inset-y-0 left-0 z-50 transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <Sidebar />
        </div>
        <main className="flex-1 flex flex-col min-w-0">
          <ChatPanel messages={chat.messages} isStreaming={chat.isStreaming} streamingContent={chat.streamingContent} />
          {/* Activity Log — tool execution feed */}
          {chat.toolEntries.length > 0 && (
            <ActivityLog entries={chat.toolEntries} isRunning={chat.isStreaming} startedAt={chat.streamStartedAt} />
          )}
          {chat.pendingDecisionGate && (
            <div className="px-4">
              <DecisionGateCard gate={chat.pendingDecisionGate}
                onSubmit={async (option, rationale) => {
                  const gate = chat.pendingDecisionGate!;
                  const client = new ApiClient(session.tenantId, session.projectId);
                  await client.submitDecision(gate.gateId, option, rationale).catch(() => {});
                  useChatStore.getState().addMessage({
                    id: `msg-${Date.now()}`, role: 'system',
                    content: `Decision Gate resolved: Option **${option}** selected.${rationale ? ` Rationale: ${rationale}` : ''}`,
                    timestamp: new Date().toISOString(),
                  });
                  useChatStore.getState().setDecisionGate(null);
                }} />
            </div>
          )}
          {/* Provider error modal */}
          {chat.providerError && (
            <ProviderErrorModal error={chat.providerError} onClose={() => useChatStore.getState().setProviderError(null)} />
          )}
          {chat.error && <div className="px-4 py-2 bg-red-900/50 text-red-300 text-sm border-t border-red-800">{chat.error}</div>}
          <ChatInput onSend={chat.sendMessage} onCancel={chat.cancelStream} isStreaming={chat.isStreaming} disabled={!settings.apiKeyValid} />
        </main>
      </div>
    </div>
  );
}

export function App() {
  const auth = useAuthStore();
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { auth.initialize(); }, []);

  if (auth.isLoading) return <LoadingScreen />;
  if (!auth.isAuthenticated) return <LandingPage />;
  if (!selectedProject) return <Dashboard onSelectProject={(id, name) => setSelectedProject({ id, name })} />;
  return <ChatView projectId={selectedProject.id} projectName={selectedProject.name} onBack={() => setSelectedProject(null)} />;
}
