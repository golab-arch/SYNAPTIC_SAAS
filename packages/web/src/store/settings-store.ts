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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providerId: 'anthropic',
      modelId: '',
      apiKey: '',
      apiKeyValid: false,
      mode: 'SYNAPTIC',
      darkMode: true,

      // Clear modelId on provider change — auto-selected by ModelCombobox on load
      setProvider: (providerId) => set({ providerId, modelId: '' }),
      setModel: (modelId) => set({ modelId }),
      setApiKey: (key, valid) => set({ apiKey: key, apiKeyValid: valid }),
      setMode: (mode) => set({ mode }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
    }),
    { name: 'synaptic-settings' },
  ),
);
