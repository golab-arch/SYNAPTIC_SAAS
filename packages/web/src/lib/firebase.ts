/**
 * Firebase client SDK — auth with Google/GitHub OAuth.
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
  try {
    const res = await fetch(`${apiBase}/api/auth/config`);
    const config = await res.json();
    if (!config.apiKey) {
      // Dev mode — no Firebase config available
      console.warn('Firebase config not available — running in dev mode');
      return;
    }
    app = initializeApp(config);
    auth = getAuth(app);
  } catch {
    console.warn('Failed to initialize Firebase — backend may be down');
  }
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
  if (!auth) {
    // Dev mode — no Firebase, no auth state changes
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
