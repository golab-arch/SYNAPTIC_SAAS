/**
 * Firebase Auth integration — verify tokens, extract user identity.
 */

// TODO: Implement in Phase 1

import type { User } from './types.js';

/**
 * Verify a Firebase ID token and return the authenticated user.
 */
export async function verifyToken(_idToken: string): Promise<User> {
  // TODO: Implement in Phase 1
  // 1. Initialize Firebase Admin SDK
  // 2. Verify ID token
  // 3. Map to User type
  // 4. Fetch tier from Firestore
  throw new Error('verifyToken not implemented');
}

/**
 * Extract the Bearer token from an Authorization header.
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
