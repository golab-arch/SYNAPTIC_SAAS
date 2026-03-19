import { useState, useRef, useEffect, useMemo } from 'react';
import { useSettingsStore } from '../../store/settings-store';
import { useOpenRouterModels } from '../../hooks/useOpenRouterModels';

const STATIC_MODELS: Record<string, Array<{ id: string; name: string }>> = {
  anthropic: [
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o3-mini', name: 'o3-mini' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  ],
};

function fmtCtx(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function fmtPrice(p?: string): string {
  if (!p) return '';
  const n = parseFloat(p) * 1_000_000;
  if (n < 0.01) return '<$0.01/M';
  if (n < 1) return `$${n.toFixed(2)}/M`;
  return `$${n.toFixed(1)}/M`;
}

interface DisplayModel { id: string; name: string; context: string; price: string }

export function ModelCombobox() {
  const { providerId, modelId, apiKey, setModel } = useSettingsStore();
  const isOpenRouter = providerId === 'openrouter';
  const { models: orModels, loading } = useOpenRouterModels(apiKey, isOpenRouter);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hlIdx, setHlIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allModels = useMemo<DisplayModel[]>(() => {
    if (isOpenRouter) {
      return orModels.map((m) => ({ id: m.id, name: m.name, context: fmtCtx(m.contextLength), price: fmtPrice(m.promptPrice) }));
    }
    return (STATIC_MODELS[providerId] ?? []).map((m) => ({ id: m.id, name: m.name, context: '', price: '' }));
  }, [providerId, isOpenRouter, orModels]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allModels;
    const q = query.toLowerCase();
    return allModels.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
  }, [allModels, query]);

  useEffect(() => { setHlIdx(0); }, [filtered.length]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!listRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectModel = (id: string) => { setModel(id); setQuery(''); setIsOpen(false); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHlIdx((i) => Math.min(i + 1, filtered.length - 1)); setIsOpen(true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHlIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && isOpen && filtered[hlIdx]) { e.preventDefault(); selectModel(filtered[hlIdx].id); }
    else if (e.key === 'Escape') { setIsOpen(false); setQuery(''); }
  };

  // Static providers: simple select
  if (!isOpenRouter) {
    return (
      <div>
        <label className="text-xs text-gray-400 block mb-1">Model</label>
        <select value={modelId} onChange={(e) => setModel(e.target.value)}
          className="w-full bg-gray-800 text-white rounded p-2 border border-gray-600 text-sm">
          {(STATIC_MODELS[providerId] ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
    );
  }

  // OpenRouter: combobox with search
  return (
    <div className="relative">
      <label className="text-xs text-gray-400 block mb-1">
        Model {loading && <span className="text-gray-500">(loading...)</span>}
      </label>
      <input ref={inputRef} type="text"
        value={isOpen ? query : (modelId || '')}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => { setQuery(''); setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder="Search models..."
        className="w-full bg-gray-800 text-white rounded p-2 border border-gray-600 text-sm
                   focus:border-synaptic-500 focus:ring-1 focus:ring-synaptic-500 font-mono" />

      {isOpen && (
        <div ref={listRef} className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {filtered.length === 0 && loading && <div className="p-3 text-sm text-gray-500">Loading models...</div>}
          {filtered.length === 0 && query.trim() && (
            <button onClick={() => selectModel(query.trim())}
              className="w-full text-left p-2 text-sm hover:bg-gray-700 text-gray-300">
              Use custom: <span className="text-synaptic-400 font-mono">{query.trim()}</span>
            </button>
          )}
          {filtered.map((model, i) => (
            <button key={model.id} onClick={() => selectModel(model.id)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === hlIdx ? 'bg-gray-700' : 'hover:bg-gray-750'
              } ${model.id === modelId ? 'border-l-2 border-synaptic-500' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-white truncate font-mono text-xs">{model.id}</span>
                {model.context && <span className="text-xs text-gray-500 ml-2 shrink-0">{model.context}</span>}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-gray-400 truncate">{model.name}</span>
                {model.price && <span className="text-xs text-green-500 ml-2 shrink-0">{model.price}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
