import { useSettingsStore } from '../../store/settings-store';
import { ApiKeyInput } from './ApiKeyInput';
import { ModelSelector } from './ModelSelector';

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic Claude', models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'] },
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'] },
  { id: 'openrouter', name: 'OpenRouter', models: ['anthropic/claude-sonnet-4', 'openai/gpt-4o', 'google/gemini-2.0-flash'] },
];

export function ProviderSelector() {
  const { providerId, mode, setProvider, setMode } = useSettingsStore();
  const current = PROVIDERS.find((p) => p.id === providerId);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-400 block mb-1">LLM Provider</label>
        <select
          value={providerId}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full bg-gray-800 text-white rounded p-2 text-sm border border-gray-600"
        >
          {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <ModelSelector models={current?.models ?? []} />
      <div>
        <label className="text-xs text-gray-400 block mb-1">Mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as 'SYNAPTIC' | 'ARCHITECT' | 'IMMEDIATE')}
          className="w-full bg-gray-800 text-white rounded p-2 text-sm border border-gray-600"
        >
          <option value="SYNAPTIC">SYNAPTIC (Full protocol)</option>
          <option value="ARCHITECT">ARCHITECT (Analysis only)</option>
          <option value="IMMEDIATE">IMMEDIATE (Skip decision gates)</option>
        </select>
      </div>
      <ApiKeyInput />
    </div>
  );
}
