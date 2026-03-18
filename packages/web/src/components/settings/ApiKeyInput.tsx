import { useState, useCallback } from 'react';
import { useSettingsStore } from '../../store/settings-store';
import { useSessionStore } from '../../store/session-store';
import { ApiClient } from '../../api/client';

export function ApiKeyInput() {
  const { apiKey, apiKeyValid, providerId, setApiKey } = useSettingsStore();
  const session = useSessionStore();
  const [testing, setTesting] = useState(false);
  const [inputValue, setInputValue] = useState(apiKey);

  const handleValidate = useCallback(async () => {
    if (!inputValue.trim()) return;
    setTesting(true);
    try {
      const client = new ApiClient(session.tenantId, session.projectId);
      const result = await client.validateKey(providerId, inputValue);
      setApiKey(inputValue, result.isValid);
    } catch {
      setApiKey(inputValue, false);
    } finally {
      setTesting(false);
    }
  }, [inputValue, providerId, session.tenantId, session.projectId, setApiKey]);

  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">API Key (BYOK)</label>
      <div className="flex gap-1">
        <input
          type="password"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="sk-ant-..."
          className="flex-1 bg-gray-800 text-white rounded p-2 text-sm border border-gray-600 placeholder-gray-500"
        />
        <button
          onClick={handleValidate}
          disabled={testing || !inputValue.trim()}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm disabled:opacity-50"
        >
          {testing ? '...' : 'Test'}
        </button>
      </div>
      {apiKey && (
        <span className={`text-xs mt-1 block ${apiKeyValid ? 'text-green-400' : 'text-red-400'}`}>
          {apiKeyValid ? 'Key validated' : 'Invalid key'}
        </span>
      )}
    </div>
  );
}
