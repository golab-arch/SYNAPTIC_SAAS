/**
 * BYOK Key Manager — encrypted storage, validation, and retrieval of user API keys.
 * Keys are encrypted AES-256-GCM via GCP Secret Manager.
 * Keys NEVER appear in logs or plaintext storage.
 */

// TODO: Implement in Phase 2

import type { EncryptedKey, KeyValidationResult } from './types.js';

export class KeyManager {
  /**
   * Store an encrypted API key for a user/provider pair.
   */
  async storeKey(
    _userId: string,
    _providerId: string,
    _plaintextKey: string,
  ): Promise<EncryptedKey> {
    // TODO: Implement in Phase 2
    // 1. Encrypt with AES-256-GCM
    // 2. Store in GCP Secret Manager
    // 3. Store metadata in Firestore
    throw new Error('KeyManager.storeKey not implemented');
  }

  /**
   * Retrieve and decrypt an API key for use in an LLM call.
   * The decrypted key must NOT be logged or persisted.
   */
  async retrieveKey(_userId: string, _providerId: string): Promise<string> {
    // TODO: Implement in Phase 2
    throw new Error('KeyManager.retrieveKey not implemented');
  }

  /**
   * Validate an API key against its provider before storing.
   */
  async validateKey(_providerId: string, _plaintextKey: string): Promise<KeyValidationResult> {
    // TODO: Implement in Phase 2
    throw new Error('KeyManager.validateKey not implemented');
  }

  /**
   * Delete a stored key (user-initiated rotation).
   */
  async deleteKey(_userId: string, _providerId: string): Promise<void> {
    // TODO: Implement in Phase 2
    throw new Error('KeyManager.deleteKey not implemented');
  }
}
