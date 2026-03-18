import { useSettingsStore } from '../../store/settings-store';

export function ModelSelector({ models }: { models: string[] }) {
  const { modelId, setModel } = useSettingsStore();

  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">Model</label>
      <select
        value={modelId}
        onChange={(e) => setModel(e.target.value)}
        className="w-full bg-gray-800 text-white rounded p-2 text-sm border border-gray-600"
      >
        {models.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}
