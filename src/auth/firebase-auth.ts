/**
 * Firebase Auth integration — verify ID tokens from frontend.
 * Uses firebase-admin SDK for server-side token verification.
 */

import type { AuthenticatedUser } from './types.js';

let adminAuth: { verifyIdToken: (token: string) => Promise<{ uid: string; email?: string; name?: string; picture?: string; firebase: { sign_in_provider: string } }> } | null = null;

/**
 * Initialize Firebase Admin lazily.
 * Only loads firebase-admin when actually needed (not in dev mode with SKIP_AUTH).
 */
async function getAdminAuth() {
  if (adminAuth) return adminAuth;

  const { getApps, initializeApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');

  if (getApps().length === 0) {
    initializeApp({ projectId: process.env['FIREBASE_PROJECT_ID'] ?? 'synaptic-saas' });
  }

  adminAuth = getAuth();
  return adminAuth;
}

/**
 * Verify a Firebase ID token and return the authenticated user.
 */
export async function verifyFirebaseToken(idToken: string): Promise<AuthenticatedUser> {
  const auth = await getAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    displayName: decoded.name ?? null,
    photoURL: decoded.picture ?? null,
    provider: decoded.firebase.sign_in_provider,
    tier: 'free', // Default; overridden by user record lookup
  };
}

/**
 * Extract Bearer token from Authorization header.
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
