/**
 * Provider tests — interface compliance + cost estimation.
 */

import { describe, it, expect } from 'vitest';
import { AnthropicProvider } from '../providers/anthropic.js';
import { OpenAIProvider } from '../providers/openai.js';
import { createProvider, getAvailableProviders } from '../providers/provider-factory.js';

describe('AnthropicProvider', () => {
  it('should implement ILLMProvider interface', () => {
    const provider = new AnthropicProvider('fake-key');
    expect(provider.id).toBe('anthropic');
    expect(provider.name).toBe('Anthropic Claude');
    expect(provider.capabilities.streaming).toBe(true);
    expect(provider.capabilities.toolUse).toBe(true);
    expect(provider.capabilities.vision).toBe(true);
  });

  it('should calculate cost estimates for sonnet', () => {
    const provider = new AnthropicProvider('fake-key');
    const estimate = provider.estimateCost({
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: 'hello world' }],
    });
    expect(estimate.estimatedCostUSD).toBeGreaterThan(0);
    expect(estimate.model).toBe('claude-sonnet-4-20250514');
    expect(estimate.provider).toBe('anthropic');
  });

  it('should calculate cost estimates for haiku (cheaper)', () => {
    const provider = new AnthropicProvider('fake-key');
    const sonnetCost = provider.estimateCost({
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: 'hello world' }],
    });
    const haikuCost = provider.estimateCost({
      model: 'claude-haiku-4-5-20251001',
      messages: [{ role: 'user', content: 'hello world' }],
    });
    expect(haikuCost.estimatedCostUSD).toBeLessThan(sonnetCost.estimatedCostUSD);
  });
});

describe('OpenAIProvider', () => {
  it('should implement ILLMProvider interface', () => {
    const provider = new OpenAIProvider('fake-key');
    expect(provider.id).toBe('openai');
    expect(provider.name).toBe('OpenAI');
    expect(provider.capabilities.streaming).toBe(true);
    expect(provider.capabilities.toolUse).toBe(true);
  });

  it('should calculate cost estimates', () => {
    const provider = new OpenAIProvider('fake-key');
    const estimate = provider.estimateCost({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(estimate.estimatedCostUSD).toBeGreaterThan(0);
    expect(estimate.model).toBe('gpt-4o');
    expect(estimate.provider).toBe('openai');
  });
});

describe('ProviderFactory', () => {
  it('should create AnthropicProvider', () => {
    const p = createProvider('anthropic', 'key');
    expect(p.id).toBe('anthropic');
  });

  it('should create OpenAIProvider', () => {
    const p = createProvider('openai', 'key');
    expect(p.id).toBe('openai');
  });

  it('should throw for unknown provider', () => {
    expect(() => createProvider('unknown', 'key')).toThrow('Unknown provider');
  });

  it('should list available providers', () => {
    const providers = getAvailableProviders();
    expect(providers).toContain('anthropic');
    expect(providers).toContain('openai');
  });
});
