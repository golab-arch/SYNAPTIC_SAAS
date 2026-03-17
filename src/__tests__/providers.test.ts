/**
 * Provider tests — interface compliance + cost estimation + factory.
 */

import { describe, it, expect } from 'vitest';
import { AnthropicProvider } from '../providers/anthropic.js';
import { OpenAIProvider } from '../providers/openai.js';
import { GeminiProvider } from '../providers/gemini.js';
import { OpenRouterProvider } from '../providers/openrouter.js';
import { createProvider, getAvailableProviders } from '../providers/provider-factory.js';

describe('AnthropicProvider', () => {
  it('should implement ILLMProvider interface', () => {
    const p = new AnthropicProvider('fake-key');
    expect(p.id).toBe('anthropic');
    expect(p.capabilities.streaming).toBe(true);
    expect(p.capabilities.toolUse).toBe(true);
  });

  it('should calculate cost for sonnet', () => {
    const p = new AnthropicProvider('fake-key');
    const c = p.estimateCost({ model: 'claude-sonnet-4-20250514', messages: [{ role: 'user', content: 'hello' }] });
    expect(c.estimatedCostUSD).toBeGreaterThan(0);
    expect(c.provider).toBe('anthropic');
  });

  it('should have haiku cheaper than sonnet', () => {
    const p = new AnthropicProvider('fake-key');
    const s = p.estimateCost({ model: 'claude-sonnet-4-20250514', messages: [{ role: 'user', content: 'x' }] });
    const h = p.estimateCost({ model: 'claude-haiku-4-5-20251001', messages: [{ role: 'user', content: 'x' }] });
    expect(h.estimatedCostUSD).toBeLessThan(s.estimatedCostUSD);
  });
});

describe('OpenAIProvider', () => {
  it('should implement ILLMProvider interface', () => {
    const p = new OpenAIProvider('fake-key');
    expect(p.id).toBe('openai');
    expect(p.capabilities.streaming).toBe(true);
  });

  it('should calculate cost', () => {
    const p = new OpenAIProvider('fake-key');
    const c = p.estimateCost({ model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }] });
    expect(c.estimatedCostUSD).toBeGreaterThan(0);
    expect(c.provider).toBe('openai');
  });
});

describe('GeminiProvider', () => {
  it('should implement ILLMProvider interface', () => {
    const p = new GeminiProvider('fake-key');
    expect(p.id).toBe('gemini');
    expect(p.capabilities.maxContextTokens).toBe(1_000_000);
  });

  it('should calculate cost', () => {
    const p = new GeminiProvider('fake-key');
    const c = p.estimateCost({ model: 'gemini-2.0-flash', messages: [{ role: 'user', content: 'hello' }] });
    expect(c.estimatedCostUSD).toBeGreaterThan(0);
    expect(c.provider).toBe('gemini');
  });
});

describe('OpenRouterProvider', () => {
  it('should implement ILLMProvider interface', () => {
    const p = new OpenRouterProvider('fake-key');
    expect(p.id).toBe('openrouter');
    expect(p.capabilities.streaming).toBe(true);
  });

  it('should support models with provider prefix', () => {
    const p = new OpenRouterProvider('fake-key');
    expect(p.capabilities.supportedModels).toContain('anthropic/claude-sonnet-4');
    expect(p.capabilities.supportedModels).toContain('openai/gpt-4o');
  });
});

describe('ProviderFactory', () => {
  it('should create all 4 providers', () => {
    for (const id of ['anthropic', 'openai', 'gemini', 'openrouter']) {
      expect(createProvider(id, 'key').id).toBe(id);
    }
  });

  it('should throw for unknown provider', () => {
    expect(() => createProvider('unknown', 'key')).toThrow('Unknown provider');
  });

  it('should list all 4 providers', () => {
    const providers = getAvailableProviders();
    expect(providers).toHaveLength(4);
    expect(providers).toContain('anthropic');
    expect(providers).toContain('openai');
    expect(providers).toContain('gemini');
    expect(providers).toContain('openrouter');
  });
});
