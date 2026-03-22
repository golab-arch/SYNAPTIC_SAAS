/**
 * Provider model listing — fetches models from each provider's API,
 * normalizes to unified ProviderModel format, enriches with static pricing.
 * Includes 5-minute cache and static fallback on failure.
 */

import { PROVIDER_PRICING, OPENAI_MODEL_INFO } from './pricing.js';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface ProviderModel {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  inputPrice: number;    // USD per million tokens (0 = unknown)
  outputPrice: number;
  supportsTools: boolean;
  capabilities: string[];  // 'tools' | 'vision' | 'streaming' | 'thinking' | 'pdf'
  provider: string;
}

// ────────────────────────────────────────────────────────────────
// Cache
// ────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: ProviderModel[]; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key: string): ProviderModel[] | null {
  const e = cache.get(key);
  return e && Date.now() < e.expires ? e.data : null;
}

function setCache(key: string, data: ProviderModel[]): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

// ────────────────────────────────────────────────────────────────
// Static fallbacks (used when API fails)
// ────────────────────────────────────────────────────────────────

const FALLBACK: Record<string, ProviderModel[]> = {
  anthropic: [
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', contextWindow: 200_000, maxOutput: 32_000, inputPrice: 15, outputPrice: 75, supportsTools: true, capabilities: ['tools', 'vision', 'streaming', 'thinking', 'pdf'], provider: 'anthropic' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 200_000, maxOutput: 16_384, inputPrice: 3, outputPrice: 15, supportsTools: true, capabilities: ['tools', 'vision', 'streaming', 'thinking', 'pdf'], provider: 'anthropic' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', contextWindow: 200_000, maxOutput: 8_192, inputPrice: 0.8, outputPrice: 4, supportsTools: true, capabilities: ['tools', 'vision', 'streaming'], provider: 'anthropic' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128_000, maxOutput: 16_384, inputPrice: 2.5, outputPrice: 10, supportsTools: true, capabilities: ['tools', 'vision', 'streaming'], provider: 'openai' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128_000, maxOutput: 16_384, inputPrice: 0.15, outputPrice: 0.6, supportsTools: true, capabilities: ['tools', 'vision', 'streaming'], provider: 'openai' },
    { id: 'o3-mini', name: 'o3 Mini', contextWindow: 200_000, maxOutput: 100_000, inputPrice: 1.1, outputPrice: 4.4, supportsTools: true, capabilities: ['tools', 'streaming'], provider: 'openai' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1_048_576, maxOutput: 65_536, inputPrice: 0.15, outputPrice: 0.6, supportsTools: true, capabilities: ['tools', 'vision', 'streaming'], provider: 'gemini' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1_048_576, maxOutput: 65_536, inputPrice: 1.25, outputPrice: 10, supportsTools: true, capabilities: ['tools', 'vision', 'streaming', 'thinking'], provider: 'gemini' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1_048_576, maxOutput: 8_192, inputPrice: 0.1, outputPrice: 0.4, supportsTools: true, capabilities: ['tools', 'vision', 'streaming'], provider: 'gemini' },
  ],
  openrouter: [],
};

// ────────────────────────────────────────────────────────────────
// Anthropic adapter
// ────────────────────────────────────────────────────────────────

interface AnthropicModelEntry {
  id: string;
  display_name?: string;
  max_input_tokens?: number;
  max_tokens?: number;
  capabilities?: Record<string, { supported?: boolean }>;
}

async function fetchAnthropic(apiKey: string): Promise<ProviderModel[]> {
  const res = await fetch('https://api.anthropic.com/v1/models?limit=100', {
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);

  const body = await res.json() as { data: AnthropicModelEntry[] };
  return body.data.map((m) => {
    const caps: string[] = ['streaming'];
    const c = m.capabilities ?? {};
    if (c.batch?.supported !== false) { /* batch is not a user-facing cap */ }
    if (c.image_input?.supported) caps.push('vision');
    if (c.pdf_input?.supported) caps.push('pdf');
    if (c.thinking?.supported) caps.push('thinking');
    // Anthropic models generally support tools
    caps.push('tools');

    const pricing = PROVIDER_PRICING.anthropic?.[m.id];
    return {
      id: m.id,
      name: m.display_name ?? m.id,
      contextWindow: m.max_input_tokens ?? 200_000,
      maxOutput: m.max_tokens ?? 4_096,
      inputPrice: pricing?.input ?? 0,
      outputPrice: pricing?.output ?? 0,
      supportsTools: true,
      capabilities: caps,
      provider: 'anthropic',
    };
  });
}

// ────────────────────────────────────────────────────────────────
// OpenAI adapter
// ────────────────────────────────────────────────────────────────

const OAI_PREFIXES = ['gpt-4', 'gpt-3.5', 'o1', 'o3', 'o4', 'chatgpt'];
const OAI_EXCLUDE = ['instruct', 'realtime', 'audio', 'search', 'tts', 'whisper', 'dall-e', 'embedding'];

async function fetchOpenAI(apiKey: string): Promise<ProviderModel[]> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);

  const body = await res.json() as { data: Array<{ id: string; owned_by: string }> };
  return body.data
    .filter((m) => {
      const id = m.id.toLowerCase();
      return OAI_PREFIXES.some((p) => id.startsWith(p)) &&
             !OAI_EXCLUDE.some((e) => id.includes(e));
    })
    .map((m) => {
      const info = OPENAI_MODEL_INFO[m.id];
      const pricing = PROVIDER_PRICING.openai?.[m.id];
      const caps: string[] = ['streaming'];
      if (info?.supportsTools) caps.push('tools');
      if (info?.supportsVision) caps.push('vision');

      return {
        id: m.id,
        name: info?.name ?? m.id,
        contextWindow: info?.contextWindow ?? 128_000,
        maxOutput: info?.maxOutput ?? 4_096,
        inputPrice: pricing?.input ?? 0,
        outputPrice: pricing?.output ?? 0,
        supportsTools: info?.supportsTools ?? false,
        capabilities: caps,
        provider: 'openai',
      };
    });
}

// ────────────────────────────────────────────────────────────────
// Gemini adapter
// ────────────────────────────────────────────────────────────────

interface GeminiModelEntry {
  name: string;
  displayName?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
}

async function fetchGemini(apiKey: string): Promise<ProviderModel[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`,
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);

  const body = await res.json() as { models?: GeminiModelEntry[] };
  return (body.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => {
      const id = m.name?.replace('models/', '') ?? '';
      const pricing = PROVIDER_PRICING.gemini?.[id];
      const caps: string[] = ['streaming', 'tools'];
      // Gemini 2.0+ and Pro models support vision
      if (id.includes('pro') || id.includes('flash') || id.includes('2.')) {
        caps.push('vision');
      }
      if (id.includes('2.5-pro')) caps.push('thinking');

      return {
        id,
        name: m.displayName ?? id,
        contextWindow: m.inputTokenLimit ?? 32_000,
        maxOutput: m.outputTokenLimit ?? 8_192,
        inputPrice: pricing?.input ?? 0,
        outputPrice: pricing?.output ?? 0,
        supportsTools: true,
        capabilities: caps,
        provider: 'gemini',
      };
    });
}

// ────────────────────────────────────────────────────────────────
// OpenRouter adapter
// ────────────────────────────────────────────────────────────────

interface ORModelEntry {
  id: string;
  name?: string;
  context_length?: number;
  top_provider?: { max_completion_tokens?: number };
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
}

async function fetchOpenRouter(apiKey: string): Promise<ProviderModel[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models?supported_parameters=tools', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://synaptic-saas.com',
      'X-Title': 'SYNAPTIC_SAAS',
    },
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);

  const body = await res.json() as { data?: ORModelEntry[] };
  return (body.data ?? [])
    .filter((m) => m.supported_parameters?.includes('tools'))
    .slice(0, 80)
    .map((m) => {
      const ip = m.pricing?.prompt ? parseFloat(m.pricing.prompt) * 1_000_000 : 0;
      const op = m.pricing?.completion ? parseFloat(m.pricing.completion) * 1_000_000 : 0;
      return {
        id: m.id,
        name: m.name ?? m.id,
        contextWindow: m.context_length ?? 128_000,
        maxOutput: m.top_provider?.max_completion_tokens ?? 4_096,
        inputPrice: ip,
        outputPrice: op,
        supportsTools: true,
        capabilities: ['tools', 'streaming'],
        provider: 'openrouter',
      };
    });
}

// ────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────

const ADAPTERS: Record<string, (apiKey: string) => Promise<ProviderModel[]>> = {
  anthropic: fetchAnthropic,
  openai: fetchOpenAI,
  gemini: fetchGemini,
  openrouter: fetchOpenRouter,
};

export async function listProviderModels(
  providerId: string,
  apiKey: string,
): Promise<ProviderModel[]> {
  const cacheKey = `${providerId}:${apiKey.slice(-8)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const adapter = ADAPTERS[providerId];
  if (!adapter) return [];

  try {
    const models = await adapter(apiKey);
    // Sort: tools-capable first, then by context window desc
    models.sort((a, b) => {
      if (a.supportsTools !== b.supportsTools) return a.supportsTools ? -1 : 1;
      return b.contextWindow - a.contextWindow;
    });
    setCache(cacheKey, models);
    return models;
  } catch (err) {
    console.error(`[model-listing] ${providerId} fetch failed:`, err);
    return FALLBACK[providerId] ?? [];
  }
}

export function getSupportedProviders(): string[] {
  return Object.keys(ADAPTERS);
}
