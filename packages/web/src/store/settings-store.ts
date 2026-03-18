import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  providerId: string;
  modelId: string;
  apiKey: string;
  apiKeyValid: boolean;
  mode: 'SYNAPTIC' | 'ARCHITECT' | 'IMMEDIATE';
  darkMode: boolean;

  setProvider: (providerId: string) => void;
  setModel: (modelId: string) => void;
  setApiKey: (key: string, valid: boolean) => void;
  setMode: (mode: SettingsState['mode']) => void;
  toggleDarkMode: () => void;
}

const MODEL_DEFAULTS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  gemini: 'gemini-2.0-flash',
  openrouter: 'anthropic/claude-sonnet-4',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      apiKey: '',
      apiKeyValid: false,
      mode: 'SYNAPTIC',
      darkMode: true,

      setProvider: (providerId) => set({ providerId, modelId: MODEL_DEFAULTS[providerId] ?? '' }),
      setModel: (modelId) => set({ modelId }),
      setApiKey: (key, valid) => set({ apiKey: key, apiKeyValid: valid }),
      setMode: (mode) => set({ mode }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
    }),
    { name: 'synaptic-settings' },
  ),
);
