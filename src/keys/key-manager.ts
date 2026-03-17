/**
 * BYOK Key Manager — encrypted storage, validation, and retrieval.
 * Keys encrypted AES-256-GCM. NEVER stored in plaintext. NEVER logged.
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { createProvider } from '../providers/provider-factory.js';
import type { EncryptedKey, KeyValidationResult } from './types.js';

export class KeyManager {
  private readonly encryptionKey: Buffer;

  constructor(masterKey?: string) {
    const key = masterKey ?? process.env['ENCRYPTION_KEY'] ?? 'synaptic-dev-key-change-in-prod';
    this.encryptionKey = createHash('sha256').update(key).digest();
  }

  /**
   * Encrypt an API key for storage.
   */
  prepareForStorage(userId: string, providerId: string, apiKey: string): EncryptedKey {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      id: randomBytes(8).toString('hex'),
      userId,
      providerId,
      encryptedValue: `${iv.toString('hex')}:${authTag}:${encrypted}`,
      createdAt: new Date(),
      lastUsedAt: null,
      isValid: true,
    };
  }

  /**
   * Decrypt a stored key. The decrypted key MUST NOT be logged or persisted.
   */
  decrypt(storedKey: EncryptedKey): string {
    const [ivHex, authTagHex, encrypted] = storedKey.encryptedValue.split(':');
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted key format');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Validate an API key by making a minimal call to the provider.
   */
  async validateKey(providerId: string, apiKey: string): Promise<KeyValidationResult> {
    try {
      const provider = createProvider(providerId, apiKey);
      const valid = await provider.validateApiKey(apiKey);
      return { isValid: valid, providerId };
    } catch (error: unknown) {
      return {
        isValid: false,
        providerId,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Detect provider from key prefix format.
   */
  detectProvider(apiKey: string): string | null {
    if (apiKey.startsWith('sk-ant-')) return 'anthropic';
    if (apiKey.startsWith('sk-or-')) return 'openrouter';
    if (apiKey.startsWith('sk-')) return 'openai';
    if (apiKey.startsWith('AIza')) return 'gemini';
    return null;
  }
}
