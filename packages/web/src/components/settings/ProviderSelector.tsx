import { useSettingsStore } from '../../store/settings-store';
import { ModelCombobox } from './ModelCombobox';
import { ApiKeyInput } from './ApiKeyInput';

export function ProviderSelector() {
  const { providerId, setProvider } = useSettingsStore();

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-400 block mb-1">LLM Provider</label>
        <select value={providerId} onChange={(e) => setProvider(e.target.value)}
          className="w-full bg-gray-800 text-white rounded p-2 text-sm border border-gray-600">
          <option value="anthropic">Anthropic Claude</option>
          <option value="openai">OpenAI</option>
          <option value="gemini">Google Gemini</option>
          <option value="openrouter">OpenRouter</option>
        </select>
      </div>
      <ModelCombobox />
      <ApiKeyInput />
    </div>
  );
}
