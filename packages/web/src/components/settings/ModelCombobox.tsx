/**
 * ModelCombobox — searchable model selector for ALL providers.
 * Shows context window, pricing, and capability badges (T=tools, V=vision, R=reasoning).
 * Dynamic model listing via API; fallback to static if API fails.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useSettingsStore } from '../../store/settings-store';
import { useProviderModels, type ProviderModel } from '../../hooks/useProviderModels';

function fmtCtx(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

function fmtPrice(price: number): string {
  if (price <= 0) return '';
  if (price < 0.01) return '<$0.01/M';
  if (price < 1) return `$${price.toFixed(2)}/M`;
  return `$${price.toFixed(1)}/M`;
}

export function ModelCombobox() {
  const { providerId, modelId, apiKey, apiKeyValid, setModel } = useSettingsStore();
  const { models, loading, error } = useProviderModels(providerId, apiKeyValid ? apiKey : '');

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hlIdx, setHlIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter by search
  const filtered = useMemo(() => {
    if (!query.trim()) return models;
    const q = query.toLowerCase();
    return models.filter((m) =>
      m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    );
  }, [models, query]);

  // Reset highlight on filter change
  useEffect(() => { setHlIdx(0); }, [filtered.length]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !listRef.current?.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-select first model when models load and none selected
  useEffect(() => {
    if (models.length > 0 && !modelId) {
      setModel(models[0]!.id);
    }
  }, [models, modelId, setModel]);

  const selectModel = (id: string) => {
    setModel(id);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHlIdx((i) => Math.min(i + 1, filtered.length - 1));
      setIsOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHlIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && isOpen && filtered[hlIdx]) {
      e.preventDefault();
      selectModel(filtered[hlIdx]!.id);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const currentModel = models.find((m) => m.id === modelId);

  return (
    <div className="relative">
      <label className="text-xs text-gray-400 block mb-1">
        Model
        {loading && <span className="text-gray-500 ml-1">(loading...)</span>}
        {error && <span className="text-red-400 ml-1">(error)</span>}
      </label>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? query : modelId || 'Select model...'}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => { setQuery(''); setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder="Search models..."
        readOnly={!apiKeyValid}
        className={`w-full bg-gray-800 text-white rounded p-2 border border-gray-600 text-sm
                   focus:border-synaptic-500 focus:ring-1 focus:ring-synaptic-500
                   ${!apiKeyValid ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
      />

      {/* Current model info badges */}
      {currentModel && !isOpen && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className="text-xs text-gray-500">{fmtCtx(currentModel.contextWindow)} ctx</span>
          {currentModel.inputPrice > 0 && (
            <span className="text-xs text-green-500">{fmtPrice(currentModel.inputPrice)} in</span>
          )}
          {currentModel.supportsTools && (
            <span className="text-xs bg-synaptic-900 text-synaptic-400 px-1 rounded">tools</span>
          )}
          {currentModel.capabilities.includes('vision') && (
            <span className="text-xs bg-blue-900 text-blue-400 px-1 rounded">vision</span>
          )}
          {currentModel.capabilities.includes('thinking') && (
            <span className="text-xs bg-purple-900 text-purple-400 px-1 rounded">think</span>
          )}
          {currentModel.capabilities.includes('pdf') && (
            <span className="text-xs bg-amber-900 text-amber-400 px-1 rounded">pdf</span>
          )}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && apiKeyValid && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg
                     shadow-xl max-h-72 overflow-y-auto"
        >
          {/* Custom model option */}
          {filtered.length === 0 && !loading && query.trim() && (
            <button
              onClick={() => selectModel(query.trim())}
              className="w-full text-left p-2 text-sm hover:bg-gray-700 text-gray-300"
            >
              Use custom: <span className="text-synaptic-400 font-mono">{query.trim()}</span>
            </button>
          )}

          {/* Empty states */}
          {filtered.length === 0 && !loading && !query.trim() && (
            <div className="p-3 text-sm text-gray-500">
              {apiKeyValid ? 'No models found' : 'Validate API key first'}
            </div>
          )}
          {loading && filtered.length === 0 && (
            <div className="p-3 text-sm text-gray-500">Loading models...</div>
          )}

          {/* Model list */}
          {filtered.map((model, i) => (
            <button
              key={model.id}
              onClick={() => selectModel(model.id)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === hlIdx ? 'bg-gray-700' : 'hover:bg-gray-700/50'
              } ${model.id === modelId ? 'border-l-2 border-synaptic-500' : ''}`}
            >
              {/* Row 1: ID + context */}
              <div className="flex items-center justify-between">
                <span className="text-white truncate font-mono text-xs">{model.id}</span>
                <span className="text-xs text-gray-500 ml-2 shrink-0">{fmtCtx(model.contextWindow)}</span>
              </div>
              {/* Row 2: Name + price + badges */}
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-gray-400 truncate">{model.name}</span>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  {model.inputPrice > 0 && (
                    <span className="text-xs text-green-500">{fmtPrice(model.inputPrice)}</span>
                  )}
                  {model.supportsTools && (
                    <span className="text-xs bg-synaptic-900/50 text-synaptic-400 px-1 rounded" title="Tool use">T</span>
                  )}
                  {model.capabilities.includes('vision') && (
                    <span className="text-xs bg-blue-900/50 text-blue-400 px-1 rounded" title="Vision">V</span>
                  )}
                  {model.capabilities.includes('thinking') && (
                    <span className="text-xs bg-purple-900/50 text-purple-400 px-1 rounded" title="Reasoning">R</span>
                  )}
                  {!model.supportsTools && (
                    <span className="text-xs bg-red-900/50 text-red-400 px-1 rounded" title="No tool support">!</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
