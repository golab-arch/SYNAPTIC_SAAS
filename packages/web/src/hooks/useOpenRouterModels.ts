import { useState, useEffect } from 'react';

export interface OpenRouterModel {
  id: string;
  name: string;
  contextLength: number;
  promptPrice?: string;
  completionPrice?: string;
}

export function useOpenRouterModels(apiKey: string, enabled: boolean) {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !apiKey) {
      setModels([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const apiBase = import.meta.env.VITE_API_URL ?? '';
    fetch(`${apiBase}/api/openrouter/models?apiKey=${encodeURIComponent(apiKey)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setModels((data as { models: OpenRouterModel[] }).models ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [apiKey, enabled]);

  return { models, loading, error };
}
