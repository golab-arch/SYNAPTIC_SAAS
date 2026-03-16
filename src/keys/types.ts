/**
 * BYOK key management types.
 * Keys are encrypted AES-256-GCM at rest, TLS 1.3 in transit.
 * Keys NEVER appear in logs or plaintext storage.
 */

/** An encrypted API key stored in GCP Secret Manager */
export interface EncryptedKey {
  readonly id: string;
  readonly userId: string;
  readonly providerId: string;
  readonly encryptedValue: string;
  readonly createdAt: Date;
  readonly lastUsedAt: Date | null;
  readonly isValid: boolean;
}

/** Result of validating an API key against its provider */
export interface KeyValidationResult {
  readonly isValid: boolean;
  readonly providerId: string;
  readonly error?: string;
  readonly modelsAvailable?: readonly string[];
}
