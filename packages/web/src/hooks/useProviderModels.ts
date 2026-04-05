/**
 * useProviderModels — fetches available models for any LLM provider.
 * Uses the generic backend endpoint GET /api/providers/:providerId/models
 */

import { useState, useEffect, useRef } from 'react';

export interface ProviderModel {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  inputPrice: number;
  outputPrice: number;
  supportsTools: boolean;
  capabilities: string[];
  provider: string;
  synapticTier?: 1 | 2 | 3;
}

export function useProviderModels(providerId: string, apiKey: string) {
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevKey = useRef('');

  useEffect(() => {
    if (!apiKey || !providerId) {
      setModels([]);
      return;
    }

    // Skip refetch if same provider+key suffix
    const key = `${providerId}:${apiKey.slice(-8)}`;
    if (key === prevKey.current && models.length > 0) return;
    prevKey.current = key;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const apiBase = import.meta.env.VITE_API_URL ?? '';
    fetch(`${apiBase}/api/providers/${providerId}/models?apiKey=${encodeURIComponent(apiKey)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { models?: ProviderModel[] }) => {
        if (!cancelled) setModels(data.models ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [providerId, apiKey]);

  return { models, loading, error };
}
