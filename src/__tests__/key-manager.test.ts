/**
 * BYOK Key Manager tests.
 */

import { describe, it, expect } from 'vitest';
import { KeyManager } from '../keys/key-manager.js';

describe('KeyManager', () => {
  it('should encrypt and decrypt API key correctly', () => {
    const km = new KeyManager('test-master-key');
    const stored = km.prepareForStorage('tenant-1', 'anthropic', 'sk-ant-test-key-12345');
    const decrypted = km.decrypt(stored);
    expect(decrypted).toBe('sk-ant-test-key-12345');
  });

  it('should produce different ciphertexts for same input (random IV)', () => {
    const km = new KeyManager('test-master-key');
    const stored1 = km.prepareForStorage('t', 'anthropic', 'sk-ant-key');
    const stored2 = km.prepareForStorage('t', 'anthropic', 'sk-ant-key');
    expect(stored1.encryptedValue).not.toBe(stored2.encryptedValue);
  });

  it('should fail decryption with wrong master key', () => {
    const km1 = new KeyManager('key-1');
    const km2 = new KeyManager('key-2');
    const stored = km1.prepareForStorage('t', 'anthropic', 'sk-ant-key');
    expect(() => km2.decrypt(stored)).toThrow();
  });

  it('should detect Anthropic provider from key prefix', () => {
    const km = new KeyManager();
    expect(km.detectProvider('sk-ant-api03-xyz')).toBe('anthropic');
  });

  it('should detect OpenAI provider from key prefix', () => {
    const km = new KeyManager();
    expect(km.detectProvider('sk-proj-abc123')).toBe('openai');
  });

  it('should detect Gemini provider from key prefix', () => {
    const km = new KeyManager();
    expect(km.detectProvider('AIzaSy123')).toBe('gemini');
  });

  it('should return null for unknown key format', () => {
    const km = new KeyManager();
    expect(km.detectProvider('unknown-format')).toBeNull();
  });

  it('should set correct metadata on stored key', () => {
    const km = new KeyManager('test');
    const stored = km.prepareForStorage('tenant-1', 'anthropic', 'sk-ant-api03-abcdef');
    expect(stored.userId).toBe('tenant-1');
    expect(stored.providerId).toBe('anthropic');
    expect(stored.id).toHaveLength(16); // 8 bytes hex
    expect(stored.isValid).toBe(true);
    expect(stored.createdAt).toBeInstanceOf(Date);
  });
});
