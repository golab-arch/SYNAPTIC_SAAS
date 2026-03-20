/**
 * Firebase client SDK — auth with Google/GitHub OAuth.
 * Throws if Firebase config is not available (handled by auth store).
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from 'firebase/auth';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export async function initFirebase(): Promise<void> {
  if (app) return;
  const apiBase = import.meta.env.VITE_API_URL ?? '';

  const res = await fetch(`${apiBase}/api/auth/config`);
  if (!res.ok) throw new Error('Auth config endpoint failed');

  const config = await res.json();
  if (!config.apiKey) throw new Error('Firebase not configured');

  app = initializeApp(config);
  auth = getAuth(app);
}

export function isFirebaseReady(): boolean {
  return auth !== null;
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export async function signInWithGoogle(): Promise<User> {
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return result.user;
}

export async function signInWithGitHub(): Promise<User> {
  if (!auth) throw new Error('Firebase not initialized');
  const provider = new GithubAuthProvider();
  provider.addScope('read:user');
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOut(): Promise<void> {
  if (auth) await firebaseSignOut(auth);
}

export async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
