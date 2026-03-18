import { useChat } from './hooks/useChat';
import { useSessionStore } from './store/session-store';
import { useSettingsStore } from './store/settings-store';
import { useChatStore } from './store/chat-store';
import { ChatPanel } from './components/chat/ChatPanel';
import { ChatInput } from './components/chat/ChatInput';
import { DecisionGateCard } from './components/decisions/DecisionGateCard';
import { SAIPanel } from './components/sai/SAIPanel';
import { GuidancePanel } from './components/guidance/GuidancePanel';
import { ProviderSelector } from './components/settings/ProviderSelector';

export function App() {
  const chat = useChat();
  const session = useSessionStore();
  const settings = useSettingsStore();

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-synaptic-500">SYNAPTIC</h1>
          <span className="text-xs text-gray-500">SaaS</span>
          <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">
            Cycle {session.currentCycle}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-400">
            Strength: <span className="text-synaptic-400 font-semibold">{session.synapticStrength}%</span>
          </div>
          <div className="text-xs text-gray-400">
            Compliance: <span className="text-green-400 font-semibold">{session.complianceScore}/100</span>
          </div>
          <button onClick={settings.toggleDarkMode} className="text-xs text-gray-500 hover:text-gray-300">
            {settings.darkMode ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-gray-900 border-r border-gray-700 overflow-y-auto flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-700">
            <ProviderSelector />
          </div>
          <div className="border-b border-gray-700">
            <SAIPanel />
          </div>
          <div className="flex-1">
            <GuidancePanel />
          </div>
        </aside>

        {/* Chat */}
        <main className="flex-1 flex flex-col min-w-0">
          <ChatPanel
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            streamingContent={chat.streamingContent}
          />

          {chat.pendingDecisionGate && (
            <div className="px-4">
              <DecisionGateCard
                gate={chat.pendingDecisionGate}
                onSubmit={(option, rationale) => {
                  console.log('Decision:', option, rationale);
                  useChatStore.getState().setDecisionGate(null);
                }}
              />
            </div>
          )}

          {chat.error && (
            <div className="px-4 py-2 bg-red-900/50 text-red-300 text-sm border-t border-red-800">
              {chat.error}
            </div>
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
